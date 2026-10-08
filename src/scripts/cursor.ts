// Over a character card the crosshair cursor widens and its centre dot fades
// to red, to show the card can be clicked. CSS cursors cannot animate, so
// over those cards the system cursor is hidden and this drawn copy follows
// the mouse. Mouse and trackpad only; touch screens keep the default.

/** Character cards: the crew cards of each game and :::card links in guides. */
export const CURSOR_TARGETS = '.crew-card--link, a.card--link';

// Same drawing as the pointer cursor in base.css.
const CROSSHAIR = `<svg viewBox="0 0 24 24" width="24" height="24">
  <g class="card-cursor-ring" fill="none" stroke="#ffd23f" stroke-width="2">
    <circle cx="12" cy="12" r="6" vector-effect="non-scaling-stroke"/>
    <path d="M12 0v7M12 17v7M0 12h7M17 12h7" vector-effect="non-scaling-stroke"/>
  </g>
  <circle class="card-cursor-dot" cx="12" cy="12" r="2"/>
</svg>`;

export function initCardCursor(): void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (!document.querySelector(CURSOR_TARGETS)) return;
  const cursor = document.createElement('div');
  cursor.className = 'card-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = CROSSHAIR;
  document.body.append(cursor);
  document.documentElement.classList.add('has-card-cursor');

  let x = 0;
  let y = 0;
  let frame = 0;
  const place = () => {
    frame = 0;
    cursor.style.translate = `${x}px ${y}px`;
  };
  const follow = (e: PointerEvent) => {
    x = e.clientX;
    y = e.clientY;
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      if (!cursor.classList.contains('is-visible')) return;
      follow(e);
      frame ||= requestAnimationFrame(place);
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const card = (e.target as Element | null)?.closest?.(CURSOR_TARGETS);
    if (!card || card.contains(e.relatedTarget as Node | null)) return;
    follow(e);
    place();
    // Appear exactly like the system cursor, then ease into the hover look.
    cursor.classList.add('is-visible');
    requestAnimationFrame(() => requestAnimationFrame(() => cursor.classList.contains('is-visible') && cursor.classList.add('is-hot')));
  });
  document.addEventListener('pointerout', (e) => {
    const card = (e.target as Element | null)?.closest?.(CURSOR_TARGETS);
    if (!card || card.contains(e.relatedTarget as Node | null)) return;
    cursor.classList.remove('is-visible', 'is-hot');
  });
}
