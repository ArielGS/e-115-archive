// Visual effects: reveal-on-scroll, parallax layers, the active section in
// the guide's table of contents and the floating "back to top" chip.
// Everything degrades to a static page with prefers-reduced-motion.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initReveal(signal?: AbortSignal): void {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal], .prose > *, .figure, .dossier, .card');
  if (reduced() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  signal?.addEventListener('abort', () => io.disconnect());
  // Measure everything first, then change classes: interleaving the two would
  // force a fresh layout for every block of a long guide.
  const fold = innerHeight;
  const onScreen = [...items].map((el) => el.getBoundingClientRect().top < fold);
  items.forEach((el, i) => {
    // Already visible on load: show immediately, no pop-in.
    if (onScreen[i]) el.classList.add('in');
    else {
      el.classList.add('will-reveal');
      io.observe(el);
    }
  });
}

export function initParallax(signal?: AbortSignal): void {
  if (reduced()) return;
  const layers = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (!layers.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    for (const el of layers) {
      const speed = Number(el.dataset.parallax) || 0.3;
      const rect = el.parentElement!.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      el.style.transform = `translate3d(0, ${(-rect.top * speed).toFixed(1)}px, 0) scale(1.15)`;
    }
  };
  addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true, signal });
  update();
}

export function initToc(signal?: AbortSignal): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.removeAttribute('aria-current'));
        byId.get(e.target.id)?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );
  signal?.addEventListener('abort', () => io.disconnect());
  byId.forEach((_, id) => {
    const target = document.getElementById(id);
    if (target) io.observe(target);
  });
}

export function initTilt(): void {
  if (reduced() || matchMedia('(hover: none)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

export function initFx(signal?: AbortSignal): void {
  initReveal(signal);
  initParallax(signal);
  initToc(signal);
  initTilt();
}
