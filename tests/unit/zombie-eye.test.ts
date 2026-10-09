// @vitest-environment jsdom
// The zombie eye in the header: where it looks, how its lids move, when it
// blinks, and what a click does (shake, rage, growl with echo).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const samples = vi.hoisted(() => ({ playSample: vi.fn(async () => {}), preloadSample: vi.fn(async () => null) }));
vi.mock('../../src/scripts/samples', async (original) => ({ ...(await original<object>()), ...samples }));

import {
  BLINK_LENGTH,
  BLINK_MAX,
  BLINK_MIN,
  EYE_CLOSED,
  GAZE_REACH,
  IRIS_TRAVEL,
  LIDS,
  RAGE_LENGTH,
  ZOMBIE_ECHO,
  ZOMBIE_GROWL,
  ZOMBIE_VOLUME,
  animateEye,
  blinkDelay,
  gaze,
  initZombieEye,
  lids,
  wakeLids,
} from '../../src/scripts/zombie-eye';
import { echoTail } from '../../src/scripts/samples';

const EYE = { x: 100, y: 50 };
const insideTravel = (p: { x: number; y: number }) => (p.x / IRIS_TRAVEL.x) ** 2 + (p.y / IRIS_TRAVEL.y) ** 2;

describe('gaze: the iris looks at the pointer', () => {
  it('looks straight ahead when the pointer is right on it', () => {
    expect(gaze(EYE, EYE)).toEqual({ x: 0, y: 0 });
  });

  it('turns towards the pointer in every direction', () => {
    expect(gaze(EYE, { x: 400, y: 50 })).toEqual({ x: IRIS_TRAVEL.x, y: 0 });
    expect(gaze(EYE, { x: -400, y: 50 })).toEqual({ x: -IRIS_TRAVEL.x, y: 0 });
    expect(gaze(EYE, { x: 100, y: 900 })).toEqual({ x: 0, y: IRIS_TRAVEL.y });
    const upLeft = gaze(EYE, { x: 0, y: -50 });
    expect(upLeft.x).toBeLessThan(0);
    expect(upLeft.y).toBeLessThan(0);
  });

  it('turns further the further away the pointer is, up to its reach', () => {
    const steps = [5, 30, 80, 150, GAZE_REACH, GAZE_REACH * 3].map((d) => gaze(EYE, { x: EYE.x + d, y: EYE.y }).x);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
    expect(steps.at(-2)).toBe(IRIS_TRAVEL.x);
    expect(steps.at(-1)).toBe(IRIS_TRAVEL.x);
  });

  it('never leaves the eye, wherever the pointer is', () => {
    for (let a = 0; a < 360; a += 7.5) {
      for (const d of [1, 20, 120, GAZE_REACH, 5000]) {
        const rad = (a * Math.PI) / 180;
        const p = gaze(EYE, { x: EYE.x + Math.cos(rad) * d, y: EYE.y + Math.sin(rad) * d });
        expect(insideTravel(p), `${a}° at ${d}px`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('lids follow the gaze', () => {
  it('rest when looking straight ahead', () => {
    expect(lids(0)).toEqual({ top: LIDS.top.rest, bottom: LIDS.bottom.rest });
  });

  it('drop when looking down and lift when looking up', () => {
    expect(lids(IRIS_TRAVEL.y)).toEqual({ top: LIDS.top.down, bottom: LIDS.bottom.down });
    expect(lids(-IRIS_TRAVEL.y)).toEqual({ top: LIDS.top.up, bottom: LIDS.bottom.up });
    expect(lids(IRIS_TRAVEL.y / 2).top).toBeGreaterThan(0);
    expect(lids(-IRIS_TRAVEL.y / 2).top).toBeLessThan(0);
  });

  it('never go past their limits', () => {
    expect(lids(IRIS_TRAVEL.y * 10)).toEqual(lids(IRIS_TRAVEL.y));
    expect(lids(-IRIS_TRAVEL.y * 10)).toEqual(lids(-IRIS_TRAVEL.y));
  });
});

describe('blinking', () => {
  it('waits a few seconds between blinks, never the same rhythm', () => {
    expect(blinkDelay(0)).toBe(BLINK_MIN);
    expect(blinkDelay(0.999999)).toBeCloseTo(BLINK_MAX, -1);
    expect(blinkDelay(-1)).toBe(BLINK_MIN);
    expect(blinkDelay(7)).toBe(BLINK_MAX);
    expect(BLINK_MIN).toBeGreaterThanOrEqual(1500);
    expect(BLINK_LENGTH).toBeLessThan(300);
  });
});

describe('waking up (the Flash intro)', () => {
  it('starts shut and ends wide open', () => {
    expect(wakeLids(0)).toEqual(EYE_CLOSED);
    expect(wakeLids(1)).toEqual({ top: 0, bottom: 0 });
  });

  it('opens a little more with every step, never closing again', () => {
    let last = wakeLids(0);
    for (let p = 0.05; p <= 1.0001; p += 0.05) {
      const now = wakeLids(p);
      expect(now.top).toBeLessThanOrEqual(last.top);
      expect(now.bottom).toBeGreaterThanOrEqual(last.bottom);
      last = now;
    }
  });

  it('struggles: at half the bar it is still mostly shut', () => {
    expect(wakeLids(0.5).top).toBeGreaterThan(EYE_CLOSED.top * 0.7);
    expect(wakeLids(0.9).top).toBeLessThan(EYE_CLOSED.top * 0.3);
  });

  it('ignores progress outside 0–1', () => {
    expect(wakeLids(-3)).toEqual(wakeLids(0));
    expect(wakeLids(1.4)).toEqual(wakeLids(1));
  });

  it('"closed" is exactly where a blink brings the lids (chrome.css keyframes)', () => {
    const styles = readFileSync('src/styles/chrome.css', 'utf8');
    const keyframe = (name: string) => Number(new RegExp(`@keyframes ${name} \\{[^@]*?translateY\\((-?[\\d.]+)px\\)`).exec(styles)?.[1]);
    expect(keyframe('eye-blink-top')).toBe(EYE_CLOSED.top);
    expect(keyframe('eye-blink-bottom')).toBe(EYE_CLOSED.bottom);
  });
});

describe('the growl', () => {
  it('is the Black Ops 2 zombie sound, shipped in public/', () => {
    expect(existsSync(join('public', ...ZOMBIE_GROWL.split('/')))).toBe(true);
    expect(ZOMBIE_VOLUME).toBeGreaterThan(0);
    expect(ZOMBIE_VOLUME).toBeLessThanOrEqual(1);
  });

  it('has a cave echo that fades out (it can never feed back forever)', () => {
    expect(ZOMBIE_ECHO.feedback).toBeGreaterThan(0);
    expect(ZOMBIE_ECHO.feedback).toBeLessThan(1);
    expect(ZOMBIE_ECHO.wet).toBeLessThan(1);
    expect(ZOMBIE_ECHO.tone).toBeLessThan(5000);
    const tail = echoTail(ZOMBIE_ECHO);
    expect(tail).toBeGreaterThan(0.5);
    expect(tail).toBeLessThan(3);
  });
});

// ---- in the page ---------------------------------------------------------------

const eye = () => document.querySelector<HTMLButtonElement>('[data-zombie-eye]')!;
const css = (name: string) => eye().style.getPropertyValue(name);
const move = (x: number, y: number) => document.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }) as PointerEvent);
const animationEnd = (name: string) => {
  const e = new Event('animationend', { bubbles: true });
  Object.defineProperty(e, 'animationName', { value: name });
  eye().dispatchEvent(e);
};

function setup({ reduced = false } = {}) {
  document.body.innerHTML = '<header class="site-header"><button type="button" data-zombie-eye aria-label="Zombie eye"></button></header>';
  window.matchMedia = ((q: string) => ({ matches: reduced && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as typeof window.matchMedia;
  // The eye sits at (100, 50) on screen.
  eye().getBoundingClientRect = () => ({ left: 79, top: 32.5, width: 42, height: 35, right: 121, bottom: 67.5, x: 79, y: 32.5, toJSON() {} }) as DOMRect;
  const page = new AbortController();
  initZombieEye(page.signal);
  return page;
}

describe('the eye in the header', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    samples.playSample.mockClear();
    samples.preloadSample.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('follows the pointer, iris and lids', () => {
    setup();
    move(900, 50);
    vi.advanceTimersByTime(20);
    expect(css('--gx')).toBe(String(IRIS_TRAVEL.x));
    expect(css('--gy')).toBe('0');
    move(100, 900);
    vi.advanceTimersByTime(20);
    expect(css('--gy')).toBe(String(IRIS_TRAVEL.y));
    expect(css('--lid-top')).toBe(String(LIDS.top.down));
    move(100, -900);
    vi.advanceTimersByTime(20);
    expect(css('--lid-top')).toBe(String(LIDS.top.up));
  });

  it('also looks where a finger touches (touch screens have no hover)', () => {
    setup();
    document.dispatchEvent(new MouseEvent('pointerdown', { clientX: -500, clientY: 50 }) as PointerEvent);
    vi.advanceTimersByTime(20);
    expect(css('--gx')).toBe(String(-IRIS_TRAVEL.x));
  });

  it('updates at most once per frame, however fast the pointer moves', () => {
    setup();
    const set = vi.spyOn(eye().style, 'setProperty');
    for (let i = 0; i < 50; i++) move(100 + i * 10, 50);
    vi.advanceTimersByTime(20);
    expect(set).toHaveBeenCalledTimes(4);
    expect(css('--gx')).toBe(String(gaze(EYE, { x: 590, y: 50 }).x));
  });

  it('blinks on its own every few seconds', () => {
    setup();
    expect(eye().classList.contains('is-blinking')).toBe(false);
    vi.advanceTimersByTime(blinkDelay(0.5));
    expect(eye().classList.contains('is-blinking')).toBe(true);
    animationEnd('eye-blink-top');
    expect(eye().classList.contains('is-blinking')).toBe(false);
    vi.advanceTimersByTime(blinkDelay(0.5));
    expect(eye().classList.contains('is-blinking')).toBe(true);
  });

  it('sometimes blinks twice in a row', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    setup();
    vi.advanceTimersByTime(blinkDelay(0.1));
    animationEnd('eye-blink-top');
    vi.advanceTimersByTime(BLINK_LENGTH + 90);
    expect(eye().classList.contains('is-blinking')).toBe(true);
  });

  it('a click wakes it up: shake, rage and a growl with echo, then it calms down with a blink', () => {
    setup();
    eye().click();
    expect(samples.playSample).toHaveBeenCalledWith(ZOMBIE_GROWL, { volume: ZOMBIE_VOLUME, echo: ZOMBIE_ECHO });
    expect(eye().classList.contains('is-shaking')).toBe(true);
    expect(eye().classList.contains('is-raging')).toBe(true);
    animationEnd('eye-shake');
    expect(eye().classList.contains('is-shaking')).toBe(false);
    vi.advanceTimersByTime(RAGE_LENGTH);
    expect(eye().classList.contains('is-raging')).toBe(false);
    expect(eye().classList.contains('is-blinking')).toBe(true);
  });

  it('clicking again keeps it angry and shakes it again', () => {
    setup();
    eye().click();
    vi.advanceTimersByTime(RAGE_LENGTH * 0.8);
    animationEnd('eye-shake');
    eye().click();
    expect(eye().classList.contains('is-shaking')).toBe(true);
    vi.advanceTimersByTime(RAGE_LENGTH * 0.5);
    expect(eye().classList.contains('is-raging')).toBe(true);
    vi.advanceTimersByTime(RAGE_LENGTH * 0.5);
    expect(eye().classList.contains('is-raging')).toBe(false);
    expect(samples.playSample).toHaveBeenCalledTimes(2);
  });

  it('does not blink while raging', () => {
    setup();
    vi.advanceTimersByTime(blinkDelay(0.5) - 10);
    eye().click();
    vi.advanceTimersByTime(20);
    expect(eye().classList.contains('is-blinking')).toBe(false);
  });

  it('downloads the growl ahead, when the pointer or the focus reaches it', () => {
    setup();
    eye().dispatchEvent(new Event('pointerenter'));
    eye().dispatchEvent(new Event('focus'));
    expect(samples.preloadSample).toHaveBeenCalledWith(ZOMBIE_GROWL);
  });

  it('with reduced motion it stays still, but still growls and flares', () => {
    setup({ reduced: true });
    move(900, 50);
    vi.advanceTimersByTime(BLINK_MAX * 2);
    expect(css('--gx')).toBe('');
    expect(eye().classList.contains('is-blinking')).toBe(false);
    eye().click();
    expect(samples.playSample).toHaveBeenCalledTimes(1);
    expect(eye().classList.contains('is-shaking')).toBe(false);
    expect(eye().classList.contains('is-raging')).toBe(true);
    vi.advanceTimersByTime(RAGE_LENGTH);
    expect(eye().classList.contains('is-raging')).toBe(false);
    expect(eye().classList.contains('is-blinking')).toBe(false);
  });

  it('an asleep eye does not blink until it wakes', () => {
    document.body.innerHTML = '<div class="zombie-eye" data-asleep></div>';
    const el = document.querySelector<HTMLElement>('.zombie-eye')!;
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as typeof window.matchMedia;
    animateEye(el);
    vi.advanceTimersByTime(BLINK_MAX * 3);
    expect(el.classList.contains('is-blinking')).toBe(false);
    delete el.dataset.asleep;
    vi.advanceTimersByTime(BLINK_MAX);
    expect(el.classList.contains('is-blinking')).toBe(true);
  });

  it('leaving the page stops it: no tracking, no blinking, no pending rage', () => {
    const page = setup();
    eye().click();
    page.abort();
    move(900, 50);
    vi.advanceTimersByTime(BLINK_MAX * 2);
    expect(css('--gx')).toBe('');
    expect(eye().classList.contains('is-blinking')).toBe(false);
    expect(eye().classList.contains('is-raging')).toBe(true);
  });
});

describe('the drawing', () => {
  const header = readFileSync('src/components/Header.astro', 'utf8');
  const intro = readFileSync('src/components/Intro.astro', 'utf8');
  const drawing = readFileSync('src/components/ZombieEye.astro', 'utf8');

  it('in the header it is a labelled button next to the home link, not inside it', () => {
    expect(drawing).toContain("const Tag = label ? 'button' : 'div';");
    expect(drawing).toMatch(/type: 'button', 'data-zombie-eye': '', 'aria-label': label/);
    expect(header).toMatch(/<ZombieEye label=\{t\(lang, 'logo\.eye'\)\} class="logo-eye" \/>/);
    expect(header.indexOf('<ZombieEye')).toBeLessThan(header.indexOf('<a class="logo"'));
    expect(header).not.toMatch(/<a class="logo"[^>]*>\s*<ZombieEye/);
  });

  it('replaces the atom of the loading screen, as decoration, with ids of its own', () => {
    expect(intro).not.toContain('intro-atom');
    expect(intro).toMatch(/<ZombieEye prefix="(\w+)" class="intro-eye" \/>/);
    expect(/prefix="(\w+)"/.exec(intro)?.[1]).not.toBe('ze');
    expect(drawing).toContain("{ 'aria-hidden': 'true' }");
    // Every id comes from the prefix, so two eyes never share one.
    expect(drawing).not.toMatch(/\bid="/);
  });

  it('its glow follows the shape of the eye: no round skin behind it', () => {
    expect(drawing).not.toMatch(/<(ellipse|circle)[^>]*fill=\{ref\('skin'\)\}/);
    expect(drawing).toMatch(/<path d=\{socket\} fill=\{ref\('skin'\)\}/);
  });

  it('has the parts the script and the styles move: iris, pupil, both lids, veins', () => {
    for (const part of ['"ze-iris"', '"ze-iris-core"', '"ze-pupil"', '"ze-pupil-wrap"', '"ze-lid ze-lid-top"', '"ze-lid ze-lid-bottom"', '"ze-veins"', '"ze-lashes"'])
      expect(drawing).toContain(`class=${part}`);
  });

  it('the favicon is the zombie eye too', () => {
    const favicon = readFileSync('public/favicon.svg', 'utf8');
    expect(favicon).toMatch(/^<svg[^>]*id="zombie-eye"/);
    expect(favicon).toContain('<ellipse'); // the slit pupil
    expect(favicon).not.toContain('<text'); // the old "115" atom
    expect(favicon).not.toMatch(/<circle[^>]*r="31"/); // no round halo either
  });
});
