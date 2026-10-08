// Single entry point for all client-side behaviour.
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

export function boot(): void {
  initLang();
  initGamesMenu();
  initIntro();
  // After the intro: the music waits for its "enter with sound" button.
  initMusic();
  initSfx();
  initTabs();
  initSpoilers();
  initChecklists();
  initNarrator();
  initFx();
  initModals();
  initNeon();
  initCardCursor();
}
