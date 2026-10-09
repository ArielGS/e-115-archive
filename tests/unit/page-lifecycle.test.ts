// @vitest-environment jsdom
// Pages change through Astro's client router without a reload (so the music
// keeps playing). Each page's behaviour must be torn down before the next
// page is swapped in, and wired again for it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER_SWAP, BEFORE_SWAP, boot } from '../../src/scripts/main';
import { FIRST_FLICKER } from '../../src/scripts/neon';

const PAGE = `
  <header class="site-header">
    <div class="brand">
      <button type="button" class="logo-eye" data-zombie-eye aria-label="Zombie eye"></button>
      <a class="logo" href="/"><span class="logo-text">115</span></a>
    </div>
    <a href="/#eras" data-games-toggle aria-expanded="false">Games</a>
    <button type="button" data-sound-toggle data-sfx aria-pressed="false">Sound: <span data-sound-label>OFF</span></button>
    <div data-games-menu hidden><ul><li><a href="/#bo3">BO3</a></li></ul></div>
  </header>
  <main id="main"><p>Page</p></main>`;

/** What the client router does on a page change (astro:transitions swap). */
function swapPage(html = PAGE) {
  document.dispatchEvent(new Event(BEFORE_SWAP));
  // The new page's <html> comes with its server-rendered attributes.
  document.documentElement.dataset.sound = 'off';
  document.body.innerHTML = html;
  document.dispatchEvent(new Event(AFTER_SWAP));
}

const toggle = () => document.querySelector<HTMLAnchorElement>('[data-games-toggle]')!;
const menu = () => document.querySelector<HTMLElement>('[data-games-menu]')!;

// One boot per test file, as on a real page: listeners added by boot() stay.
let booted = false;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.setItem('archivo115:intro-seen', '1');
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as typeof window.matchMedia;
  document.body.innerHTML = PAGE;
  if (!booted) {
    boot();
    booted = true;
  } else swapPage();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('page lifecycle with the client router', () => {
  it('wires the new page after a swap', () => {
    swapPage();
    toggle().click();
    expect(menu().hidden).toBe(false);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('drops the old page listeners, so they never pile up', () => {
    const oldMenu = menu();
    toggle().click();
    expect(oldMenu.hidden).toBe(false);
    swapPage();
    // The old page's "click outside closes the menu" listener is gone…
    document.body.click();
    expect(oldMenu.hidden).toBe(false);
    // …and the new page's toggle works exactly once (not once per visited page).
    toggle().click();
    expect(menu().hidden).toBe(false);
    document.body.click();
    expect(menu().hidden).toBe(true);
  });

  it('keeps the sound setting on <html> and the header toggle after a swap', () => {
    localStorage.setItem('archivo115:sound', 'on');
    swapPage();
    expect(document.documentElement.dataset.sound).toBe('on');
    const btn = document.querySelector('[data-sound-toggle]')!;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.querySelector('[data-sound-label]')!.textContent).toBe('ON');
  });

  it('stops the old page timers (the logo flicker restarts with each page)', () => {
    const oldLogo = document.querySelector('.site-header .logo')!;
    swapPage();
    vi.advanceTimersByTime(FIRST_FLICKER + 10);
    expect(oldLogo.classList.contains('is-flickering')).toBe(false);
    expect(document.querySelector('.site-header .logo')!.classList.contains('is-flickering')).toBe(true);
  });
});
