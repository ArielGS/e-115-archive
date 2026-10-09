// The zombie eye: the header logo and the eye of the Flash intro. It never
// stops watching the pointer. The iris follows it, the eyelids follow the iris (looking down drops the upper
// lid, looking up lifts it) and it blinks every few seconds. Clicking it (or
// Enter / Space: it is a button) wakes it up: it shakes, the pupil snaps
// open, the veins flare and, with sound on, a Black Ops 2 zombie growls with
// a cave echo. With reduced motion it stays still: no tracking, no blinking,
// no shaking (the sound and the colour flare still work). In the intro it
// starts shut and drags its lids open as the loading bar fills.
import { playSample, preloadSample, type Echo } from './samples';

export const ZOMBIE_GROWL = '/sounds/Voicy_Black ops 2 zombies sfx.mp3';
export const ZOMBIE_VOLUME = 0.85;
/** A dark tunnel: four or five audible repeats, a quarter second apart. */
export const ZOMBIE_ECHO: Echo = { delay: 0.26, feedback: 0.45, wet: 0.55, tone: 1800 };

export interface Point {
  x: number;
  y: number;
}

/** How far the iris can travel from the centre (SVG units, an ellipse). */
export const IRIS_TRAVEL: Point = { x: 7, y: 4 };
/** Pointer distance (CSS px) at which the iris reaches the edge of its travel. */
export const GAZE_REACH = 240;
/** Upper / lower lid offsets (SVG units): resting, looking up, looking down. */
export const LIDS = {
  top: { rest: 0, up: -2.5, down: 3 },
  bottom: { rest: 0, up: -0.8, down: 1.5 },
} as const;
/** Time between blinks (ms) and the chance that a blink comes in a pair. */
export const BLINK_MIN = 2200;
export const BLINK_MAX = 6500;
export const DOUBLE_BLINK = 0.2;
export const BLINK_LENGTH = 180;
/** How long the eye stays enraged after a click (ms). */
export const RAGE_LENGTH = 1100;

const round = (n: number) => Math.round(n * 100) / 100 || 0;
// Towards zero, so rounding can never push the iris out of the eye.
const trunc = (n: number) => Math.trunc(n * 100) / 100 || 0;

/**
 * Where the iris sits for a pointer at `pointer` and an eye centred at `eye`
 * (both in CSS px): towards the pointer, further the further away it is
 * (eased), always inside the IRIS_TRAVEL ellipse.
 */
export function gaze(eye: Point, pointer: Point, travel: Point = IRIS_TRAVEL, reach = GAZE_REACH): Point {
  const dx = pointer.x - eye.x;
  const dy = pointer.y - eye.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return { x: 0, y: 0 };
  const pull = Math.min(1, dist / reach);
  const eased = 1 - (1 - pull) ** 2;
  return { x: trunc((dx / dist) * eased * travel.x), y: trunc((dy / dist) * eased * travel.y) };
}

/** Eyelid offsets for an iris at height `irisY`: the lids follow the gaze. */
export function lids(irisY: number, travelY = IRIS_TRAVEL.y): { top: number; bottom: number } {
  const t = Math.max(-1, Math.min(1, irisY / travelY));
  const follow = (lid: { rest: number; up: number; down: number }) => round(t < 0 ? lid.rest + (lid.up - lid.rest) * -t : lid.rest + (lid.down - lid.rest) * t);
  return { top: follow(LIDS.top), bottom: follow(LIDS.bottom) };
}

/** Lid offsets of a closed eye (SVG units): the blink keyframes in chrome.css. */
export const EYE_CLOSED = { top: 11, bottom: -5 } as const;

/**
 * Extra lid offsets while the eye wakes up (`progress` from 0 to 1): shut at
 * first, it barely opens for most of the way and only forces itself fully
 * open at the end.
 */
export function wakeLids(progress: number): { top: number; bottom: number } {
  const p = Math.max(0, Math.min(1, progress));
  const shut = 1 - p ** 2.2;
  return { top: round(EYE_CLOSED.top * shut), bottom: round(EYE_CLOSED.bottom * shut) };
}

/** Milliseconds until the next blink, for a random number in [0, 1). */
export function blinkDelay(random: number): number {
  return Math.round(BLINK_MIN + Math.max(0, Math.min(1, random)) * (BLINK_MAX - BLINK_MIN));
}

/** Restarts a CSS animation class, even if it is already running. */
function retrigger(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).getBoundingClientRect();
  el.classList.add(cls);
}

export interface LivingEye {
  /** Shake, wide open, red flare; it calms down with a blink. */
  enrage(): void;
}

/**
 * Brings an eye to life until `signal` aborts: it watches the pointer and
 * blinks now and then (not while raging, nor while `data-asleep` is set).
 */
export function animateEye(eye: HTMLElement, signal?: AbortSignal): LivingEye {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  signal?.addEventListener('abort', () => timers.forEach(clearTimeout));

  // ---- the stare -----------------------------------------------------------
  let pointer: Point | null = null;
  let frame = 0;
  const look = () => {
    frame = 0;
    if (!pointer || signal?.aborted) return;
    const r = eye.getBoundingClientRect();
    const iris = gaze({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, pointer);
    const lid = lids(iris.y);
    eye.style.setProperty('--gx', String(iris.x));
    eye.style.setProperty('--gy', String(iris.y));
    eye.style.setProperty('--lid-top', String(lid.top));
    eye.style.setProperty('--lid-bottom', String(lid.bottom));
  };
  if (!still) {
    const follow = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      frame ||= requestAnimationFrame(look);
    };
    document.addEventListener('pointermove', follow, { passive: true, signal });
    document.addEventListener('pointerdown', follow, { passive: true, signal });
  }

  // ---- blinking --------------------------------------------------------------
  const blink = () => retrigger(eye, 'is-blinking');
  eye.addEventListener('animationend', (e) => {
    if (e.animationName === 'eye-blink-top') eye.classList.remove('is-blinking');
    if (e.animationName === 'eye-shake') eye.classList.remove('is-shaking');
  });
  const scheduleBlink = () =>
    later(() => {
      // Not while it is raging (eyes wide open), asleep, or the tab is hidden.
      if (!document.hidden && !eye.classList.contains('is-raging') && eye.dataset.asleep === undefined) {
        blink();
        if (Math.random() < DOUBLE_BLINK) later(blink, BLINK_LENGTH + 90);
      }
      scheduleBlink();
    }, blinkDelay(Math.random()));
  if (!still) scheduleBlink();

  // ---- rage ----------------------------------------------------------------------
  let rage: ReturnType<typeof setTimeout> | undefined;
  const enrage = () => {
    eye.classList.remove('is-blinking');
    if (!still) retrigger(eye, 'is-shaking');
    eye.classList.add('is-raging');
    if (rage) {
      clearTimeout(rage);
      timers.delete(rage);
    }
    const id = setTimeout(() => {
      timers.delete(id);
      eye.classList.remove('is-raging');
      // Calms down with a slow blink.
      if (!still) blink();
    }, RAGE_LENGTH);
    rage = id;
    timers.add(id);
  };
  return { enrage };
}

export function initZombieEye(signal?: AbortSignal): void {
  const eye = document.querySelector<HTMLButtonElement>('[data-zombie-eye]');
  if (!eye) return;
  const { enrage } = animateEye(eye, signal);
  eye.addEventListener('pointerenter', () => void preloadSample(ZOMBIE_GROWL));
  eye.addEventListener('focus', () => void preloadSample(ZOMBIE_GROWL));
  eye.addEventListener('click', () => {
    void playSample(ZOMBIE_GROWL, { volume: ZOMBIE_VOLUME, echo: ZOMBIE_ECHO });
    enrage();
  });
}
