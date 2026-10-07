// Wires the :::checklist blocks: ticking a step saves it, the counter and bar
// follow, and "Reset" clears that checklist. Progress is keyed by checklist
// id, so it is shared between the Spanish and English pages.
import { safeStorage } from './spoiler-store';
import { loadDone, progress, saveDone, setStep } from './checklist-store';
import { blip } from './sfx';

export function initChecklists(root: ParentNode = document): void {
  const blocks = [...root.querySelectorAll<HTMLElement>('[data-checklist]')];
  if (!blocks.length) return;
  const store = safeStorage();

  for (const block of blocks) {
    const id = block.dataset.checklist!;
    const boxes = [...block.querySelectorAll<HTMLInputElement>('input[data-check]')];
    const steps = boxes.map((b) => b.dataset.check!);
    const counter = block.querySelector<HTMLElement>('[data-checklist-count]');
    const bar = block.querySelector<HTMLElement>('[data-checklist-progress]');
    let done = loadDone(store, id);

    const render = () => {
      for (const box of boxes) {
        box.checked = done.has(box.dataset.check!);
        box.closest('li')?.classList.toggle('is-done', box.checked);
      }
      const p = progress(done, steps);
      if (counter) counter.textContent = `${p.done}/${p.total}`;
      bar?.style.setProperty('--progress', String(p.ratio));
      block.classList.toggle('is-complete', p.complete);
    };

    for (const box of boxes) {
      box.addEventListener('change', () => {
        done = setStep(done, box.dataset.check!, box.checked);
        saveDone(store, id, done);
        blip(box.checked ? 'open' : 'close');
        render();
      });
    }
    block.querySelector('[data-checklist-reset]')?.addEventListener('click', () => {
      done = new Set();
      saveDone(store, id, done);
      blip('close');
      render();
    });
    render();
  }
}
