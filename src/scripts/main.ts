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

export function boot(): void {
  initLang();
  initGamesMenu();
  initIntro();
  initSfx();
  initTabs();
  initSpoilers();
  initChecklists();
  initNarrator();
  initFx();
}
