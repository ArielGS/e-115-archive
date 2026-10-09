// The header "Games" chip: a disclosure that opens the list of games. It is a
// plain link to the game tabs until this script turns it into a button.
import { blip } from './sfx';

export function initGamesMenu(signal?: AbortSignal): void {
  const toggle = document.querySelector<HTMLAnchorElement>('[data-games-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-games-menu]');
  if (!toggle || !menu) return;
  toggle.setAttribute('role', 'button');

  const isOpen = () => !menu.hidden;
  const setOpen = (open: boolean, focus: 'menu' | 'toggle' | null = null) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open && focus === 'menu') menu.querySelector<HTMLElement>('a')?.focus();
    if (!open && focus === 'toggle') toggle.focus();
  };

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    blip(isOpen() ? 'close' : 'open');
    // Opened from the keyboard: move into the list so arrows/Tab work right away.
    setOpen(!isOpen(), e.detail === 0 ? 'menu' : null);
  });
  toggle.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      toggle.click();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true, 'menu');
    }
  });

  const items = () => [...menu.querySelectorAll<HTMLAnchorElement>('a')];
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      list[next]?.focus();
    }
  });
  // Choosing a game closes the menu (on the home page the tab switches via the hash).
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  });
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && isOpen()) setOpen(false, 'toggle');
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Node;
      if (isOpen() && !menu.contains(target) && !toggle.contains(target)) setOpen(false);
    },
    { signal },
  );
  // Tabbing out of the menu closes it.
  menu.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Node | null;
    if (next && !menu.contains(next) && next !== toggle) setOpen(false);
  });
}
