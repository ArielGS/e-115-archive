// Era tabs (WaW / BO1 / BO2 / BO3) on the home page. The URL hash (#bo2) selects
// a tab so each era can be linked directly.
import { blip } from './sfx';

/** Pure: which tab should be active for a given location hash. */
export function resolveTab(hash: string, available: string[], fallback: string): string {
  const wanted = decodeURIComponent(hash.replace(/^#/, '')).toLowerCase();
  if (available.includes(wanted)) return wanted;
  const prefix = available.find((id) => wanted.startsWith(`${id}-`));
  return prefix ?? fallback;
}

type Place = Pick<Location, 'origin' | 'pathname'>;

/**
 * Pure: the tab a link opens on the page being read (the Games menu on the
 * home page links to "/#bo2"), or null when it leads somewhere else.
 */
export function linkedTab(link: Place & { hash: string }, here: Place, available: string[]): string | null {
  const id = decodeURIComponent(link.hash.replace(/^#/, '')).toLowerCase();
  return link.origin === here.origin && link.pathname === here.pathname && available.includes(id) ? id : null;
}

export function initTabs(signal?: AbortSignal): void {
  const list = document.querySelector<HTMLElement>('[data-tabs]');
  if (!list) return;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const ids = tabs.map((t) => t.dataset.tab!);
  const fallback = list.dataset.default ?? ids[ids.length - 1];

  const select = (id: string, opts: { focus?: boolean; push?: boolean; animate?: boolean } = {}) => {
    for (const tab of tabs) {
      const on = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      if (panel) {
        panel.hidden = !on;
        if (on && opts.animate) {
          panel.classList.remove('panel-enter');
          void panel.offsetWidth;
          panel.classList.add('panel-enter');
        }
      }
      if (on && opts.focus) tab.focus();
    }
    document.documentElement.style.setProperty('--era-accent', tabs.find((t) => t.dataset.tab === id)?.dataset.accent ?? '');
    if (opts.push && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      blip('tab');
      select(tab.dataset.tab!, { push: true, animate: true });
    });
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        select(ids[e.key === 'Home' ? 0 : ids.length - 1], { focus: true, push: true, animate: true });
      } else if (step) {
        e.preventDefault();
        select(ids[(i + step + ids.length) % ids.length], { focus: true, push: true, animate: true });
      }
    });
  });

  window.addEventListener(
    'hashchange',
    () => {
      const id = resolveTab(location.hash, ids, fallback);
      if (ids.includes(location.hash.slice(1))) {
        select(id, { animate: true });
        document.getElementById('eras')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    { signal },
  );
  // A link to a tab of this same page: the client router would only update
  // the address (no hashchange), so the browser follows the hash itself and
  // the hashchange handler above switches the tab, as without the router.
  document.addEventListener(
    'click',
    (e) => {
      const link = (e.target as Element | null)?.closest?.('a[href*="#"]');
      if (!(link instanceof HTMLAnchorElement) || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const id = linkedTab(link, location, ids);
      if (!id) return;
      e.preventDefault();
      if (location.hash !== `#${id}`) location.hash = id;
      else {
        select(id, { animate: true });
        document.getElementById('eras')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    { capture: true, signal },
  );
  select(resolveTab(location.hash, ids, fallback));
  if (ids.includes(location.hash.slice(1))) {
    requestAnimationFrame(() => document.getElementById('eras')?.scrollIntoView());
  }
}
