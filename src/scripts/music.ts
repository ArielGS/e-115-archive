// Background music: one looping track ("Nuclear Winter", public/sounds) that
// plays on every page while sound is on. It is streamed by an <audio> element
// (thirteen minutes would be far too big to decode into memory) and routed
// through WebAudio for smooth volume changes. Pages change without a reload
// (see main.ts) and the element lives in a host the client router carries
// over (transition:persist in Base.astro), so the track never stops between
// pages. After a real reload it resumes where it was. It dips while the
// voice narrator speaks. On a first visit it stays silent while the Flash
// intro is up and starts with "enter with sound".
import { audio, soundEnabled } from './sfx';
import { url } from '../lib/site';

export const MUSIC = '/sounds/nuclear-winter.mp3';
/** Music level while sound is on (0–1). */
export const MUSIC_VOLUME = 0.3;
/** While the narrator speaks the music drops 10%. */
export const NARRATOR_DUCK = 0.9;
/** Fired by the narrator when it starts or stops speaking (detail: { playing }). */
export const NARRATOR_EVENT = 'archivo115:narrator';

/** Element the router keeps from page to page (Base.astro); the track plays inside it. */
export const MUSIC_HOST = '[data-music-host]';

const POSITION_KEY = 'archivo115:music-at';

/** Target volume of the music, given whether the narrator is speaking. */
export function musicVolume(narrating: boolean, base = MUSIC_VOLUME): number {
  return Number((narrating ? base * NARRATOR_DUCK : base).toFixed(4));
}

/** Where to resume after a page change: a saved time inside the track, or 0. */
export function resumeAt(saved: string | null, duration = Infinity): number {
  const t = Number(saved);
  return Number.isFinite(t) && t > 0 && t < duration ? t : 0;
}

export function initMusic(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  let el: HTMLAudioElement | null = null;
  let gain: GainNode | null = null;
  let narrating = false;
  let waiting = false;

  const target = () => (soundEnabled() ? musicVolume(narrating) : 0);

  const setLevel = (fade: number) => {
    if (!el || !gain) return;
    const level = target();
    el.dataset.volume = String(level);
    el.dataset.ducked = String(narrating);
    const t = gain.context.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.setTargetAtTime(level, t, fade / 3);
  };

  const setup = (ac: AudioContext) => {
    if (el) return;
    el = document.createElement('audio');
    el.dataset.music = '';
    el.hidden = true;
    el.loop = true;
    el.preload = 'none';
    el.src = url(MUSIC);
    try {
      el.currentTime = resumeAt(sessionStorage.getItem(POSITION_KEY));
    } catch {
      /* no saved position */
    }
    (document.querySelector(MUSIC_HOST) ?? document.body).append(el);
    gain = ac.createGain();
    gain.gain.value = 0;
    ac.createMediaElementSource(el).connect(gain).connect(ac.destination);
    addEventListener('pagehide', () => {
      try {
        if (el && !el.paused) sessionStorage.setItem(POSITION_KEY, String(el.currentTime));
      } catch {
        /* ignore */
      }
    });
  };

  // Browsers keep audio silent until the visitor interacts with the page: on
  // a fresh page load the music waits for the first click or key press. It
  // starts after that click's own handlers ran, so a click that turns sound
  // off never lets a note through.
  const waitForGesture = () => {
    if (waiting) return;
    waiting = true;
    const go = () => {
      waiting = false;
      ['click', 'keydown'].forEach((type) => removeEventListener(type, go, true));
      setTimeout(start, 0);
    };
    ['click', 'keydown'].forEach((type) => addEventListener(type, go, true));
  };

  const start = () => {
    // The Flash intro is up: its "enter with sound" button starts the music.
    if (!soundEnabled() || document.documentElement.classList.contains('intro-lock')) return;
    const ac = audio();
    if (!ac) return;
    setup(ac);
    if (ac.state !== 'running') waitForGesture();
    el!
      .play()
      .then(() => setLevel(1.5))
      .catch(waitForGesture);
    setLevel(1.5);
  };

  const stop = () => {
    if (!el || el.paused) return;
    setLevel(0.6);
    const playing = el;
    setTimeout(() => {
      if (!soundEnabled()) playing.pause();
    }, 700);
  };

  document.addEventListener('archivo115:sound', (e) => ((e as CustomEvent<{ on: boolean }>).detail.on ? start() : stop()));
  document.addEventListener(NARRATOR_EVENT, (e) => {
    narrating = (e as CustomEvent<{ playing: boolean }>).detail.playing;
    setLevel(0.5);
  });
  if (soundEnabled()) start();
}
