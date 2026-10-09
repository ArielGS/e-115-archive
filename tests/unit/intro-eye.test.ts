// @vitest-environment jsdom
// The zombie eye of the Flash intro (the loading screen): shut while it
// loads, it drags its lids open with the bar and wakes up at 100%.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/scripts/samples', async (original) => ({
  ...(await original<object>()),
  playSample: vi.fn(async () => {}),
  preloadSample: vi.fn(async () => null),
}));

import { initIntro } from '../../src/scripts/intro';
import { BLINK_MAX, EYE_CLOSED, wakeLids } from '../../src/scripts/zombie-eye';

const INTRO = `
  <div class="intro" data-intro hidden data-lines="uno|dos">
    <div class="intro-box">
      <div aria-hidden="true" class="zombie-eye intro-eye"></div>
      <div data-intro-bar></div><div data-intro-pct>000</div><ul data-intro-log></ul>
      <button type="button" data-intro-enter="on">Sound</button>
      <button type="button" data-intro-enter="off">No sound</button>
    </div>
    <button type="button" data-intro-skip>Skip</button>
  </div>`;

const eye = () => document.querySelector<HTMLElement>('.intro-eye')!;
const wake = () => ({ top: Number(eye().style.getPropertyValue('--wake-top')), bottom: Number(eye().style.getPropertyValue('--wake-bottom')) });
const ready = () => document.querySelector('.intro')!.classList.contains('is-ready');
const loadToTheEnd = () => {
  for (let i = 0; i < 200 && !ready(); i++) vi.advanceTimersByTime(100);
};

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as typeof window.matchMedia;
  document.body.innerHTML = INTRO;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the eye of the loading screen', () => {
  it('starts shut and asleep', () => {
    initIntro();
    expect(wake()).toEqual(EYE_CLOSED);
    expect(eye().dataset.asleep).toBe('');
  });

  it('opens with the loading bar, a bit at a time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // no straining, steady steps
    initIntro();
    vi.advanceTimersByTime(300 + 115 * 6);
    const pct = Number(document.querySelector('[data-intro-pct]')!.textContent);
    expect(pct).toBeGreaterThan(20);
    expect(pct).toBeLessThan(100);
    expect(wake().top).toBeLessThan(EYE_CLOSED.top);
    expect(wake().top).toBeGreaterThan(0);
    expect(wake()).toEqual(wakeLids(Number(document.querySelector<HTMLElement>('[data-intro-bar]')!.style.getPropertyValue('--p'))));
  });

  it('sometimes strains to open further than the bar', () => {
    const rolls = [0.5, 0.5, 0.05]; // next blink, loading step, strain
    vi.spyOn(Math, 'random').mockImplementation(() => rolls.shift() ?? 0.5);
    initIntro();
    vi.advanceTimersByTime(300);
    const p = Number(document.querySelector<HTMLElement>('[data-intro-bar]')!.style.getPropertyValue('--p'));
    expect(wake()).toEqual(wakeLids(p + 0.2));
  });

  it('at 100% it wakes up: wide open, raging, then watching', () => {
    initIntro();
    loadToTheEnd();
    expect(ready()).toBe(true);
    expect(wake()).toEqual({ top: 0, bottom: 0 });
    expect(eye().dataset.asleep).toBeUndefined();
    expect(eye().classList.contains('is-raging')).toBe(true);
    expect(eye().classList.contains('is-shaking')).toBe(true);
  });

  it('it stops living once you enter the site', () => {
    initIntro();
    loadToTheEnd();
    document.querySelector<HTMLButtonElement>('[data-intro-enter="off"]')!.click();
    vi.advanceTimersByTime(700);
    expect(document.querySelector('.intro')).toBeNull();
    // The removed eye left nothing behind: no blink or rage timers pending.
    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.advanceTimersByTime(BLINK_MAX * 3)).not.toThrow();
  });
});
