// The Flash-site preloader: a fake "LOADING" bar that runs once per browser
// session, then asks "enter with sound / without sound" — exactly like 2004.
import { setSound, audio, blip } from './sfx';

const SEEN = 'archivo115:intro-seen';

const seen = () => {
  try {
    return sessionStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
};

export function initIntro(): void {
  const intro = document.querySelector<HTMLElement>('.intro[data-intro]');
  if (!intro) {
    document.documentElement.classList.remove('intro-pending');
    return;
  }
  if (seen() || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.remove();
    document.documentElement.classList.remove('intro-lock', 'intro-pending');
    return;
  }
  document.documentElement.classList.add('intro-lock');
  intro.hidden = false;

  const pct = intro.querySelector<HTMLElement>('[data-intro-pct]')!;
  const bar = intro.querySelector<HTMLElement>('[data-intro-bar]')!;
  const log = intro.querySelector<HTMLElement>('[data-intro-log]')!;
  const lines = (intro.dataset.lines ?? '').split('|').filter(Boolean);
  let value = 0;
  let line = 0;

  const done = (withSound: boolean | null) => {
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {
      /* ignore */
    }
    if (withSound !== null) setSound(withSound);
    if (withSound) {
      audio();
      blip('open');
    }
    intro.classList.add('is-leaving');
    document.documentElement.classList.remove('intro-lock', 'intro-pending');
    setTimeout(() => intro.remove(), 700);
  };

  const tick = () => {
    value = Math.min(100, value + Math.random() * 9 + 2);
    pct.textContent = String(Math.floor(value)).padStart(3, '0');
    bar.style.setProperty('--p', String(value / 100));
    if (lines.length && value > ((line + 1) * 100) / (lines.length + 1)) {
      const li = document.createElement('li');
      li.textContent = lines[line++] ?? '';
      log.append(li);
    }
    if (value < 100) setTimeout(tick, 70 + Math.random() * 90);
    else {
      pct.textContent = '115';
      intro.classList.add('is-ready');
      // Focus the default choice so Enter works, without drawing a focus ring
      // for mouse and touch users (keyboard users still get it on Tab).
      intro.querySelector<HTMLButtonElement>('[data-intro-enter="off"]')?.focus({ focusVisible: false } as FocusOptions);
    }
  };
  setTimeout(tick, 300);

  intro.querySelectorAll<HTMLButtonElement>('[data-intro-enter]').forEach((b) =>
    b.addEventListener('click', () => done(b.dataset.introEnter === 'on')),
  );
  intro.querySelector('[data-intro-skip]')?.addEventListener('click', () => done(null));
}
