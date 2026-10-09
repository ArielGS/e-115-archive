// The Flash-site preloader: a fake "LOADING" bar that runs once per browser
// session, then asks "enter with sound / without sound" — exactly like 2004.
// Entering with sound sets off an electric spark (and starts the music).
// The zombie eye above the bar wakes up as it loads: shut at first, it drags
// its lids open and, at 100%, snaps wide open and shakes.
import { setSound, soundEnabled, audio } from './sfx';
import { playSample, preloadSample, ENTER_SPARK, SPARK } from './samples';
import { animateEye, wakeLids } from './zombie-eye';

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

  const eye = intro.querySelector<HTMLElement>('.intro-eye');
  const life = new AbortController();
  const living = eye ? animateEye(eye, life.signal) : null;
  const wake = (progress: number) => {
    if (!eye) return;
    const lid = wakeLids(progress);
    eye.style.setProperty('--wake-top', String(lid.top));
    eye.style.setProperty('--wake-bottom', String(lid.bottom));
  };
  if (eye) eye.dataset.asleep = '';
  wake(0);
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
    // Lift the lock first: the music waits for it before starting.
    intro.classList.add('is-leaving');
    document.documentElement.classList.remove('intro-lock', 'intro-pending');
    // Skipping keeps the sound setting from an earlier visit.
    setSound(withSound ?? soundEnabled());
    if (withSound) {
      audio();
      void playSample(SPARK, ENTER_SPARK);
    }
    setTimeout(() => {
      life.abort();
      intro.remove();
    }, 700);
  };

  const tick = () => {
    value = Math.min(100, value + Math.random() * 9 + 2);
    pct.textContent = String(Math.floor(value)).padStart(3, '0');
    bar.style.setProperty('--p', String(value / 100));
    // Now and then it strains to open a little more than the bar allows.
    if (value < 100) wake(value / 100 + (Math.random() < 0.15 ? 0.2 : 0));
    if (lines.length && value > ((line + 1) * 100) / (lines.length + 1)) {
      const li = document.createElement('li');
      li.textContent = lines[line++] ?? '';
      log.append(li);
    }
    if (value < 100) setTimeout(tick, 70 + Math.random() * 90);
    else {
      pct.textContent = '115';
      intro.classList.add('is-ready');
      // Awake: wide open, a shake and a red flare, then it watches you.
      if (eye) delete eye.dataset.asleep;
      wake(1);
      living?.enrage();
      void preloadSample(SPARK);
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
