// Language switch in the header. The automatic redirect (browser language or
// saved choice) runs inline in <head> before the page paints; see Base.astro.
import { LANG_STORAGE_KEY, isLang } from '../i18n/ui';

export function saveLang(lang: string): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* storage blocked: the choice lasts for this navigation only */
  }
}

const sections = () => [...document.querySelectorAll<HTMLElement>('.prose h2[id]')];

/**
 * Section ids are translated ("#la-bestia" vs "#the-beast"), so a section
 * travels between languages by position: "#section-3". Spoiler and tab ids
 * are identical in both languages and pass through untouched.
 */
export function portableHash(hash: string): string {
  if (!hash) return '';
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  const index = target ? sections().indexOf(target) : -1;
  return index >= 0 ? `#section-${index + 1}` : hash;
}

function resolvePortableHash(): void {
  const m = location.hash.match(/^#section-(\d+)$/);
  if (!m) return;
  const target = sections()[Number(m[1]) - 1];
  if (!target) return;
  history.replaceState(null, '', `#${target.id}`);
  target.scrollIntoView();
}

export function initLang(): void {
  resolvePortableHash();
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const lang = link.dataset.langSwitch;
      if (!isLang(lang)) return;
      saveLang(lang);
      if (link.getAttribute('aria-current') === 'true') {
        e.preventDefault();
        return;
      }
      // Keep the section the reader was looking at.
      if (location.hash) {
        e.preventDefault();
        location.href = link.href + portableHash(location.hash);
      }
    });
  });
}
