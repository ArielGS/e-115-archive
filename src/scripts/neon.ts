// The header logo flickers like a failing fluorescent tube: once within the
// first 30 seconds on a page, then every 2 minutes.
// With sound on, the tube buzzes: a synthesized mains hum ("backrooms" office
// light) that cuts in and out in step with the light, ticks each time the
// starter strikes, and fades out once the tube settles. One pattern drives
// both the picture and the sound, so they never drift apart.
// No flicker (and no buzz) with reduced motion.
import { audio, soundEnabled } from './sfx';
import { SAMPLE_EVENT } from './samples';

/** First flicker after landing on a page, in milliseconds. */
export const FIRST_FLICKER = 30_000;
export const FLICKER_EVERY = 120_000;
/** The buzz plays at 48% of its full level (80%, then 40% quieter). */
export const FLICKER_VOLUME = 0.48;
/** Length of the flicker, in milliseconds: a slow, tired tube (half speed). */
export const FLICKER_LENGTH = 2200;
/** After the flicker the hum lingers and fades for this many seconds. */
export const HUM_TAIL = 1.6;

/**
 * Brightness of the tube over the flicker: [offset 0–1, level 0–1]. Each
 * level holds until the next point (a tube snaps on and off, it never fades).
 */
export const FLICKER_PATTERN: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.05, 0.15],
  [0.09, 1],
  [0.15, 0.35],
  [0.19, 0.9],
  [0.24, 0.05],
  [0.42, 1],
  [0.58, 0.55],
  [0.62, 1],
];

export interface FlickerScore {
  /** Hum level from each moment on (seconds from the start). */
  hum: { at: number; level: number }[];
  /** Moments the starter strikes: the light jumps back up. */
  strikes: number[];
}

/**
 * Turns the brightness pattern into sound cues: the hum follows the light
 * (squared, so a dim tube is nearly silent) and every big jump up is a strike.
 */
export function flickerScore(pattern = FLICKER_PATTERN, seconds = FLICKER_LENGTH / 1000): FlickerScore {
  const hum = pattern.map(([offset, level]) => ({ at: offset * seconds, level: Number((level * level).toFixed(4)) }));
  const strikes = pattern.filter(([, level], i) => i > 0 && level - pattern[i - 1][1] >= 0.4).map(([offset]) => offset * seconds);
  return { hum, strikes };
}

const HUM_LEVEL = 0.07;
const STRIKE_LEVEL = 0.16;

/** Mains hum: 60 Hz body, 120 Hz ballast buzz, a few gritty harmonics. */
const HUM_PARTIALS: { freq: number; type: OscillatorType; gain: number }[] = [
  { freq: 60, type: 'sine', gain: 0.5 },
  { freq: 120, type: 'sawtooth', gain: 0.45 },
  { freq: 240, type: 'square', gain: 0.12 },
  { freq: 360, type: 'sawtooth', gain: 0.08 },
];

export function playFlickerSound(volume = FLICKER_VOLUME): void {
  if (!soundEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.02;
  const { hum, strikes } = flickerScore();
  const end = t0 + FLICKER_LENGTH / 1000;
  const stopAt = end + HUM_TAIL + 0.1;

  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);

  // The hum, through a soft clipper (the ballast's grit), the tube's on/off
  // envelope and a low-pass.
  const tube = ac.createGain();
  tube.gain.setValueAtTime(0, t0);
  for (const { at, level } of hum) tube.gain.setTargetAtTime(level * HUM_LEVEL, t0 + at, 0.004);
  tube.gain.setTargetAtTime(HUM_LEVEL * 0.6, end, 0.05);
  tube.gain.setTargetAtTime(0, end + 0.3, HUM_TAIL / 4);
  const grit = ac.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 2.5);
  grit.curve = curve;
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2400;
  tone.Q.value = 0.8;
  grit.connect(tube).connect(tone).connect(master);

  // An unsteady tube wobbles: a slow tremolo on the hum.
  const wobble = ac.createOscillator();
  const wobbleDepth = ac.createGain();
  wobble.frequency.value = 9;
  wobbleDepth.gain.value = 0.25;
  const steady = ac.createGain();
  steady.gain.value = 1;
  wobble.connect(wobbleDepth).connect(steady.gain);
  steady.connect(grit);

  const sources: AudioScheduledSourceNode[] = [wobble];
  for (const p of HUM_PARTIALS) {
    const osc = ac.createOscillator();
    osc.type = p.type;
    osc.frequency.value = p.freq;
    osc.detune.value = (Math.random() - 0.5) * 8;
    const g = ac.createGain();
    g.gain.value = p.gain;
    osc.connect(g).connect(steady);
    sources.push(osc);
  }

  // Each strike: a dry electric tick (filtered noise) plus a tiny metallic ping.
  const noise = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.04), ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  for (const at of strikes) {
    const t = t0 + at;
    const tick = ac.createBufferSource();
    tick.buffer = noise;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const tg = ac.createGain();
    tg.gain.value = STRIKE_LEVEL;
    tick.connect(hp).connect(tg).connect(master);
    tick.start(t);
    const ping = ac.createOscillator();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(3100 + Math.random() * 400, t);
    const pg = ac.createGain();
    pg.gain.setValueAtTime(STRIKE_LEVEL * 0.25, t);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    ping.connect(pg).connect(master);
    ping.start(t);
    ping.stop(t + 0.06);
  }

  for (const s of sources) {
    s.start(t0);
    s.stop(stopAt);
  }
  setTimeout(() => master.disconnect(), (stopAt - ac.currentTime + 0.2) * 1000);
  document.dispatchEvent(new CustomEvent(SAMPLE_EVENT, { detail: { src: 'neon-hum', volume, from: 1 } }));
}

export function flicker(logo: HTMLElement): void {
  logo.classList.add('is-flickering');
  setTimeout(() => logo.classList.remove('is-flickering'), FLICKER_LENGTH);
  const frames = FLICKER_PATTERN.map(([offset, level]) => ({ offset, opacity: level, easing: 'step-end' }));
  // The eye and the name flicker together.
  (logo.closest('.brand') ?? logo)
    .querySelectorAll<HTMLElement>('.logo-eye, .logo-text')
    .forEach((part) => part.animate?.([...frames, { offset: 1, opacity: 1 }], FLICKER_LENGTH));
  playFlickerSound();
}

export function initNeon(signal?: AbortSignal): void {
  const logo = document.querySelector<HTMLElement>('.site-header .logo');
  if (!logo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tick = () => {
    // Not while the tab is in the background or the Flash intro is up.
    if (document.hidden || document.documentElement.classList.contains('intro-lock')) return;
    flicker(logo);
  };
  let every: ReturnType<typeof setInterval> | undefined;
  const first = setTimeout(() => {
    tick();
    every = setInterval(tick, FLICKER_EVERY);
  }, FIRST_FLICKER);
  // Leaving the page: the next page starts its own clock.
  signal?.addEventListener('abort', () => {
    clearTimeout(first);
    clearInterval(every);
  });
}
