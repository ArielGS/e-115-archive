// Modal windows built on <dialog>: a [data-modal-open] button opens the
// dialog it names in aria-controls. Escape, the close button and a click on
// the dimmed backdrop close it; the browser returns focus to the button.
import { blip } from './sfx';

export function initModals(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-modal-open]').forEach((btn) => {
    const dialog = document.getElementById(btn.getAttribute('aria-controls') ?? '');
    if (!(dialog instanceof HTMLDialogElement)) return;
    const open = () => {
      if (dialog.open) return;
      dialog.showModal();
      btn.setAttribute('aria-expanded', 'true');
      dialog.querySelector('.modal-body')?.scrollTo(0, 0);
      blip('open');
    };
    btn.addEventListener('click', open);
    dialog.addEventListener('close', () => {
      btn.setAttribute('aria-expanded', 'false');
      blip('close');
      if (location.hash === `#${dialog.id}`) history.replaceState(null, '', location.pathname + location.search);
    });
    dialog.querySelectorAll('[data-modal-close]').forEach((c) => c.addEventListener('click', () => dialog.close()));
    // A click on the dialog itself (not its frame) is a click on the backdrop.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    // Browsers close a modal dialog on Escape themselves; this also covers
    // synthetic key events (tests, assistive tools) that skip that default.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialog.open) dialog.close();
    });
    // Old links to the section (/#manual) open the window.
    if (location.hash === `#${dialog.id}`) open();
  });
}
