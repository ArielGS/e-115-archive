// Flash-era UI sounds, synthesized with WebAudio (the music and the spark are
// recorded files: see music.ts and samples.ts).
// Sound is opt-in: off until the visitor enables it, remembered per browser.

const KEY = 'archivo115:sound';
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.sound = on ? 'on' : 'off';
  document.dispatchEvent(new CustomEvent('archivo115:sound', { detail: { on } }));
}

export function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Blip = 'hover' | 'click' | 'open' | 'close' | 'alert' | 'tab';

const SHAPES: Record<Blip, { type: OscillatorType; from: number; to: number; dur: number; gain: number }> = {
  hover: { type: 'square', from: 880, to: 1320, dur: 0.04, gain: 0.025 },
  click: { type: 'square', from: 520, to: 260, dur: 0.07, gain: 0.04 },
  tab: { type: 'sawtooth', from: 220, to: 660, dur: 0.12, gain: 0.035 },
  open: { type: 'triangle', from: 200, to: 900, dur: 0.35, gain: 0.06 },
  close: { type: 'triangle', from: 700, to: 160, dur: 0.18, gain: 0.05 },
  alert: { type: 'square', from: 440, to: 440, dur: 0.16, gain: 0.04 },
};

export function blip(kind: Blip): void {
  if (!soundEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const s = SHAPES[kind];
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = s.type;
  osc.frequency.setValueAtTime(s.from, t);
  osc.frequency.exponentialRampToValueAtTime(s.to, t + s.dur);
  gain.gain.setValueAtTime(s.gain, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + s.dur + 0.02);
}

/**
 * Hover/click blips on anything marked data-sfx, plus the sound toggle.
 * Runs on every page (a page change also resets the <html> attributes).
 */
export function initSfx(signal?: AbortSignal): void {
  document.documentElement.dataset.sound = soundEnabled() ? 'on' : 'off';
  document.addEventListener(
    'pointerover',
    (e) => {
      const t = (e.target as Element | null)?.closest?.('[data-sfx]');
      if (t && !t.contains(e.relatedTarget as Node | null)) blip('hover');
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as Element | null)?.closest?.('[data-sfx]')) blip('click');
    },
    { signal },
  );
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((btn) => {
    const sync = () => {
      const on = soundEnabled();
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('[data-sound-label]')!.textContent = on ? 'ON' : 'OFF';
    };
    btn.addEventListener('click', () => {
      setSound(!soundEnabled());
      if (soundEnabled()) audio();
      sync();
    });
    document.addEventListener('archivo115:sound', sync, { signal });
    sync();
  });
}
