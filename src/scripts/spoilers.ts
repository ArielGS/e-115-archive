// Wires the spoiler blocks produced by remark-zombies: eye button -> inline
// confirmation -> reveal. Revealed ids persist per page in localStorage.
import { loadRevealed, saveRevealed, reveal, hide, prune, safeStorage } from './spoiler-store';
import { blip } from './sfx';
import { strings } from '../i18n/client';

export const SPOILER_EVENT = 'archivo115:spoilers';

export function initSpoilers(root: ParentNode = document): void {
  const page = document.body.dataset.page ?? location.pathname;
  const store = safeStorage();
  const blocks = [...root.querySelectorAll<HTMLElement>('[data-spoiler]')];
  if (!blocks.length) return;

  const L = strings();
  let revealed = prune(loadRevealed(store, page), blocks.map((b) => b.id));

  const counters = document.querySelectorAll<HTMLElement>('[data-spoiler-count]');
  const bars = document.querySelectorAll<HTMLElement>('[data-spoiler-progress]');

  const render = (animate: boolean) => {
    for (const block of blocks) {
      const open = revealed.has(block.id);
      const wasOpen = block.classList.contains('is-open');
      block.classList.toggle('is-open', open);
      block.querySelector('.spoiler-confirm')?.setAttribute('hidden', '');
      block.classList.remove('is-confirming');
      const btn = block.querySelector<HTMLButtonElement>('[data-spoiler-toggle]');
      if (btn) {
        btn.setAttribute('aria-expanded', String(open));
        const label = btn.querySelector('.eye-btn-text');
        if (label) label.textContent = open ? L.hide : L.reveal;
      }
      if (animate && open && !wasOpen) {
        block.classList.add('just-opened');
        setTimeout(() => block.classList.remove('just-opened'), 900);
      }
    }
    const count = blocks.filter((b) => revealed.has(b.id)).length;
    counters.forEach((c) => (c.textContent = `${count}/${blocks.length}`));
    bars.forEach((b) => b.style.setProperty('--progress', String(blocks.length ? count / blocks.length : 0)));
    document.dispatchEvent(new CustomEvent(SPOILER_EVENT, { detail: { revealed: [...revealed] } }));
  };

  const commit = (next: Set<string>) => {
    revealed = next;
    saveRevealed(store, page, revealed);
    render(true);
  };

  for (const block of blocks) {
    const confirm = block.querySelector<HTMLElement>('.spoiler-confirm');
    block.querySelector('[data-spoiler-toggle]')?.addEventListener('click', () => {
      if (revealed.has(block.id)) {
        blip('close');
        commit(hide(revealed, block.id));
        return;
      }
      blip('alert');
      block.classList.add('is-confirming');
      confirm?.removeAttribute('hidden');
      confirm?.querySelector<HTMLButtonElement>('[data-spoiler-accept]')?.focus();
    });
    block.querySelector('[data-spoiler-accept]')?.addEventListener('click', () => {
      blip('open');
      commit(reveal(revealed, block.id));
      block.querySelector<HTMLButtonElement>('[data-spoiler-toggle]')?.focus();
    });
    block.querySelector('[data-spoiler-cancel]')?.addEventListener('click', () => {
      blip('close');
      confirm?.setAttribute('hidden', '');
      block.classList.remove('is-confirming');
      block.querySelector<HTMLButtonElement>('[data-spoiler-toggle]')?.focus();
    });
  }

  document.querySelectorAll('[data-spoiler-reset]').forEach((btn) =>
    btn.addEventListener('click', () => {
      blip('close');
      commit(new Set());
    }),
  );

  render(false);
}
