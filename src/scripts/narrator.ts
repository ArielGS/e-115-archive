// "Transmisión" voice narrator: reads the current guide aloud with the
// browser's free Web Speech API (no servers, no keys), highlights what is
// being read and can play a synthesized ambience underneath.
import { buildScript, toUtterances, type Segment } from './narrator-script';
import { startAmbient, type Mood } from './ambient';
import { startRecording } from './recording';
import { SPOILER_EVENT } from './spoilers';
import { blip } from './sfx';
import { NARRATOR_EVENT } from './music';
import { strings, pageLang } from '../i18n/client';
import type { Lang } from '../i18n/ui';

// The chosen voice is remembered per page language. The old key, shared by
// both languages, is still read so existing choices carry over.
const VOICE_KEY = (lang: Lang) => `archivo115:voice:${lang}`;
const LEGACY_VOICE_KEY = 'archivo115:voice';
const RATE_KEY = 'archivo115:rate';
const RECORDING_KEY = 'archivo115:recording';

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

const NOVELTY =
  /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|kathy|ralph|fred)\b/i;

export type VoiceQuality = 'natural' | 'good' | 'basic' | 'novelty';

/**
 * How human a voice sounds, from what browsers expose:
 * - natural: neural voices. Edge's "Microsoft … Online (Natural)", Apple's
 *   downloadable Enhanced/Premium voices (marked in the voiceURI), Siri.
 * - good: Google's online voices (Chrome, Android).
 * - basic: classic local voices (Windows "Desktop" voices, compact Apple voices…).
 * - novelty: macOS joke and Eloquence voices.
 */
export function voiceQuality(v: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): VoiceQuality {
  const id = `${v.name} ${v.voiceURI}`;
  if (NOVELTY.test(v.name) || /eloquence/i.test(v.voiceURI)) return 'novelty';
  if (/\b(natural|neural|premium|enhanced|siri)\b/i.test(id)) return 'natural';
  if (/\bgoogle\b/i.test(id)) return 'good';
  return 'basic';
}

const QUALITY_SCORE: Record<VoiceQuality, number> = { natural: 40, good: 20, basic: 0, novelty: -50 };

/**
 * Voices in the page language first, then the most natural-sounding (a
 * neural voice from Mexico beats a robotic one from Spain), then the region
 * (for Spanish: Spain, then Latin America).
 */
export function rankVoices(voices: SpeechSynthesisVoice[], lang: Lang = 'es'): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (speaksLang(v, lang)) s += 100;
    s += QUALITY_SCORE[voiceQuality(v)];
    if (lang === 'es' && /es-ES/i.test(v.lang)) s += 10;
    if (lang === 'es' && /es-(MX|US|419)/i.test(v.lang)) s += 8;
    if (lang === 'en' && /en-(US|GB)/i.test(v.lang)) s += 10;
    if (/m[oó]nica|jorge|paulina|juan|diego|marisol|helena|laura|[aá]lvaro|elvira|dalia|jimena|samantha|daniel|karen|moira|serena|aria|jenny|guy/i.test(v.name)) s += 4;
    if (v.localService) s += 1;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/** True when the voice speaks the page language ("es" matches es-ES, es-MX, es_419…). */
export const speaksLang = (v: Pick<SpeechSynthesisVoice, 'lang'>, lang: Lang) => new RegExp(`^${lang}(\\b|-|_|$)`, 'i').test(v.lang);

/**
 * The voice to preselect: the one the visitor chose before, if it still
 * exists and speaks the page language; otherwise the best voice in that
 * language. A Spanish page never starts with a French voice because of an
 * old choice or a browser default.
 */
export function pickVoice(ranked: SpeechSynthesisVoice[], lang: Lang, saved: (string | null)[] = []): SpeechSynthesisVoice | undefined {
  for (const uri of saved) {
    const v = uri ? ranked.find((x) => x.voiceURI === uri) : undefined;
    if (v && speaksLang(v, lang)) return v;
  }
  return ranked.find((v) => speaksLang(v, lang)) ?? ranked[0];
}

export function initNarrator(): void {
  const lang = pageLang();
  const L = strings(lang);
  const panel = document.querySelector<HTMLElement>('[data-narrator]');
  const root = document.querySelector<HTMLElement>('[data-tts-root]');
  if (!panel || !root) return;

  const $ = <T extends Element>(sel: string) => panel.querySelector<T>(sel)!;
  const status = $<HTMLElement>('[data-n-status]');
  const count = $<HTMLElement>('[data-n-count]');
  const now = $<HTMLElement>('[data-n-now]');
  const playBtn = $<HTMLButtonElement>('[data-n-play]');
  const voiceSel = $<HTMLSelectElement>('[data-n-voice]');
  const rateSel = $<HTMLSelectElement>('[data-n-rate]');
  const ambientChk = $<HTMLInputElement>('[data-n-ambient]');
  const followChk = $<HTMLInputElement>('[data-n-follow]');
  const recordingChk = $<HTMLInputElement>('[data-n-recording]');
  const voiceTip = $<HTMLElement>('[data-n-voice-tip]');
  const scope = $<HTMLCanvasElement>('[data-n-scope]');

  const minBtn = $<HTMLButtonElement>('[data-n-min]');
  // Minimising only hides the panel's details: playback, ambience and the
  // recording effect carry on. Closing (✕) is what stops the narrator.
  const setMinimized = (min: boolean) => {
    panel.classList.toggle('is-min', min);
    minBtn.setAttribute('aria-expanded', String(!min));
    minBtn.setAttribute('aria-label', min ? L.expand : L.minimize);
    minBtn.title = min ? L.expand : L.minimize;
  };
  minBtn.addEventListener('click', () => setMinimized(!panel.classList.contains('is-min')));

  const setOpen = (open: boolean) => {
    panel.classList.toggle('is-open', open);
    if (!open) setMinimized(false);
    document.querySelectorAll('[data-narrator-open]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
  };
  document.querySelectorAll('[data-narrator-open]').forEach((b) =>
    b.addEventListener('click', () => {
      setOpen(true);
      if (b.hasAttribute('data-autoplay') && !playing) play();
    }),
  );
  $('[data-n-close]').addEventListener('click', () => {
    stop();
    setOpen(false);
  });

  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  if (!synth) {
    panel.classList.add('is-unsupported');
    status.textContent = L.noVoice;
    return;
  }

  // ---- voices -----------------------------------------------------------
  let voices: SpeechSynthesisVoice[] = [];
  const loadVoices = () => {
    voices = rankVoices(synth.getVoices(), lang);
    voiceSel.innerHTML = '';
    const option = (v: SpeechSynthesisVoice) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})${voiceQuality(v) === 'natural' ? ' · natural' : ''}`;
      return opt;
    };
    // Page-language voices first; the rest in their own group, so a voice
    // that cannot pronounce the guide is never picked by accident.
    const own = voices.filter((v) => speaksLang(v, lang));
    const others = voices.filter((v) => !speaksLang(v, lang));
    voiceSel.append(...own.map(option));
    if (others.length) {
      const group = document.createElement('optgroup');
      group.label = L.otherVoices;
      group.append(...others.map(option));
      voiceSel.append(group);
    }
    const chosen = pickVoice(voices, lang, [store.get(VOICE_KEY(lang)), store.get(LEGACY_VOICE_KEY)]);
    if (chosen) voiceSel.value = chosen.voiceURI;
    voiceSel.disabled = voices.length === 0;
    // Only robotic voices for this language: say where better ones are.
    voiceTip.hidden = voices.length === 0 || (!!own[0] && voiceQuality(own[0]) === 'natural');
  };
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
  voiceSel.addEventListener('change', () => {
    const v = voices.find((x) => x.voiceURI === voiceSel.value);
    if (v && speaksLang(v, lang)) store.set(VOICE_KEY(lang), v.voiceURI);
  });
  rateSel.value = store.get(RATE_KEY) ?? '1';
  rateSel.addEventListener('change', () => store.set(RATE_KEY, rateSel.value));
  recordingChk.checked = store.get(RECORDING_KEY) !== 'off';

  // ---- script & playback --------------------------------------------------
  const intro = root.dataset.ttsIntro;
  const mood = (document.body.dataset.ambient ?? 'default') as Mood;
  let segments: Segment[] = [];
  let queue: { text: string; index: number }[] = [];
  let pos = 0;
  let playing = false;
  let ambient: ReturnType<typeof startAmbient> = null;
  let recording: ReturnType<typeof startRecording> = null;
  let speakingToken = 0;

  const setRecording = (on: boolean) => {
    if (on) recording ??= startRecording();
    else {
      recording?.stop();
      recording = null;
    }
    panel.dataset.recording = recording ? 'on' : 'off';
  };

  const rebuild = () => {
    const currentEl = segments[queue[pos]?.index]?.el;
    segments = buildScript(root, intro, lang);
    queue = toUtterances(segments, 220, lang);
    const idx = currentEl ? segments.findIndex((s) => s.el === currentEl) : -1;
    pos = idx >= 0 ? queue.findIndex((u) => u.index === idx) : Math.min(pos, Math.max(queue.length - 1, 0));
    renderCount();
  };

  const renderCount = () => {
    const seg = queue[pos]?.index ?? 0;
    count.textContent = `${String(Math.min(seg + 1, segments.length)).padStart(2, '0')}/${String(segments.length).padStart(2, '0')}`;
  };

  const highlight = (seg?: Segment) => {
    document.querySelectorAll('.tts-active').forEach((e) => e.classList.remove('tts-active'));
    if (!seg || seg.el === root) return;
    const target = seg.el.closest('.narration') ? seg.el.closest('.narration')!.previousElementSibling ?? seg.el : seg.el;
    target.classList.add('tts-active');
    if (followChk.checked) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const speak = () => {
    const token = ++speakingToken;
    if (pos >= queue.length) {
      finish();
      return;
    }
    const item = queue[pos];
    const seg = segments[item.index];
    highlight(seg);
    renderCount();
    now.textContent = seg.kind === 'narration' ? `“${item.text}”` : item.text;
    panel.dataset.kind = seg.kind;
    const u = new SpeechSynthesisUtterance(item.text);
    const voice = voices.find((v) => v.voiceURI === voiceSel.value);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (lang === 'en' ? 'en-US' : 'es-ES');
    u.rate = Number(rateSel.value) || 1;
    u.pitch = seg.kind === 'locked' ? 0.85 : 1;
    const advance = () => {
      if (token !== speakingToken || !playing) return;
      pos += 1;
      // A short beat between sections makes it sound less robotic.
      const pause = seg.kind === 'heading' ? 350 : 120;
      setTimeout(() => token === speakingToken && playing && speak(), pause);
    };
    u.onend = advance;
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') advance();
    };
    recording?.cue();
    synth.speak(u);
  };

  const setPlaying = (on: boolean) => {
    // The background music dips while the narrator speaks.
    if (on !== playing) document.dispatchEvent(new CustomEvent(NARRATOR_EVENT, { detail: { playing: on } }));
    playing = on;
    panel.classList.toggle('is-playing', on);
    playBtn.setAttribute('aria-label', on ? L.pause : L.play);
    playBtn.dataset.state = on ? 'pause' : 'play';
    status.textContent = on ? L.playing : pos > 0 && pos < queue.length ? L.paused : L.ready;
  };

  const play = () => {
    if (!queue.length) rebuild();
    if (pos >= queue.length) pos = 0;
    synth.cancel();
    setPlaying(true);
    if (ambientChk.checked && !ambient) ambient = startAmbient(mood);
    setRecording(recordingChk.checked);
    blip('tab');
    speak();
  };

  const pause = () => {
    speakingToken++;
    synth.cancel();
    setPlaying(false);
    ambient?.stop();
    ambient = null;
    setRecording(false);
  };

  const stop = () => {
    pause();
    pos = 0;
    highlight();
    now.textContent = '';
    renderCount();
    status.textContent = L.ready;
  };

  const finish = () => {
    setPlaying(false);
    ambient?.stop();
    ambient = null;
    setRecording(false);
    highlight();
    pos = 0;
    status.textContent = L.finished;
  };

  const jump = (dir: 1 | -1) => {
    if (!queue.length) rebuild();
    const currentSeg = queue[pos]?.index ?? 0;
    const targetSeg = Math.max(0, Math.min(segments.length - 1, currentSeg + dir));
    pos = queue.findIndex((u) => u.index === targetSeg);
    if (playing) {
      synth.cancel();
      speak();
    } else {
      highlight(segments[targetSeg]);
      renderCount();
    }
  };

  playBtn.addEventListener('click', () => (playing ? pause() : play()));
  $('[data-n-next]').addEventListener('click', () => jump(1));
  $('[data-n-prev]').addEventListener('click', () => jump(-1));
  $('[data-n-stop]').addEventListener('click', stop);
  ambientChk.addEventListener('change', () => {
    if (!playing) return;
    if (ambientChk.checked) ambient ??= startAmbient(mood);
    else {
      ambient?.stop();
      ambient = null;
    }
  });
  recordingChk.addEventListener('change', () => {
    store.set(RECORDING_KEY, recordingChk.checked ? 'on' : 'off');
    if (playing) setRecording(recordingChk.checked);
  });
  document.addEventListener(SPOILER_EVENT, () => segments.length && rebuild());
  window.addEventListener('pagehide', () => synth.cancel());

  // ---- oscilloscope -------------------------------------------------------
  const g = scope.getContext('2d');
  let phase = 0;
  const draw = () => {
    if (g) {
      const { width: w, height: h } = scope;
      g.clearRect(0, 0, w, h);
      g.strokeStyle = getComputedStyle(panel).getPropertyValue('--scope') || '#7cff4f';
      g.lineWidth = 2;
      g.beginPath();
      const amp = playing ? h * 0.32 : h * 0.04;
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 + Math.sin(x * 0.09 + phase) * amp * Math.sin(x * 0.013 + phase * 0.3) + (playing ? (Math.random() - 0.5) * 3 : 0);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      phase += playing ? 0.35 : 0.04;
    }
    requestAnimationFrame(draw);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(draw);

  rebuild();
  setPlaying(false);
  panel.dataset.recording = 'off';
}
