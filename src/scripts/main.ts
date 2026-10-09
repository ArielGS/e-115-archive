// Single entry point for all client-side behaviour.
//
// The site moves between pages without reloading (Astro's client router, see
// Base.astro): a fresh document would start with its audio locked until the
// next click, so the music would stop on every page change. The document,
// the audio context and the music live on; each page's behaviour is wired
// after it is swapped in and torn down (listeners, timers, narration) through
// an AbortSignal before the next one replaces it.
import { initIntro } from './intro';
import { initSfx } from './sfx';
import { initTabs } from './tabs';
import { initSpoilers } from './spoilers';
import { initChecklists } from './checklist';
import { initNarrator } from './narrator';
import { initFx } from './fx';
import { initLang } from './lang';
import { initGamesMenu } from './games-menu';
import { initMusic } from './music';
import { initNeon } from './neon';
import { initModals } from './modal';
import { initCardCursor } from './cursor';

/** Fired by the client router before the old page is replaced (see astro:transitions). */
export const BEFORE_SWAP = 'astro:before-swap';
/** Fired by the client router once the new page is in the document. */
export const AFTER_SWAP = 'astro:after-swap';

function initPage(): AbortController {
  const page = new AbortController();
  const { signal } = page;
  initLang();
  initGamesMenu(signal);
  initIntro();
  initSfx(signal);
  initTabs(signal);
  initSpoilers();
  initChecklists();
  initNarrator(signal);
  initFx(signal);
  initModals(signal);
  initNeon(signal);
  initCardCursor(signal);
  return page;
}

export function boot(): void {
  let page = initPage();
  // After the intro: the music waits for its "enter with sound" button. It
  // is wired once and keeps playing across page changes.
  initMusic();
  document.addEventListener(BEFORE_SWAP, () => page.abort());
  document.addEventListener(AFTER_SWAP, () => (page = initPage()));
}
