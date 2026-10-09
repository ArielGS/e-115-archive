// The zombie eye in the header (logo): it watches the pointer, blinks, and
// a click shakes it and (with sound on) sets off a Black Ops 2 zombie growl.
const ZOMBIE = '/sounds/Voicy_Black ops 2 zombies sfx.mp3';

type Played = { src: string; volume: number; echo: { delay: number; feedback: number; wet: number } | null };

const recordSamples = () =>
  cy.document().then((doc) => {
    const played: Played[] = [];
    doc.addEventListener('archivo115:sample', (e) => played.push((e as CustomEvent).detail));
    cy.wrap(played).as('played');
  });

/** Retries until the eye's CSS variable (set on the next frame) passes `check`. */
const eyeVar = (name: string, check: (value: number) => void) =>
  cy.get('[data-zombie-eye]').should(($e) => check(Number($e[0].style.getPropertyValue(name) || 0)));

/** Moves the pointer to (dx, dy) px from the centre of the eye. */
const pointAt = (dx: number, dy: number) =>
  cy.get('[data-zombie-eye]').then(($e) => {
    const r = $e[0].getBoundingClientRect();
    cy.document().trigger('pointermove', { clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2 + dy });
  });

describe('Zombie eye logo', () => {
  it('replaces the atom: a labelled button beside the home link, in both languages', () => {
    cy.visitPage('/');
    cy.get('.site-header .logo-mark').should('not.exist');
    cy.get('.site-header [data-zombie-eye]')
      .should('be.visible')
      .and('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Ojo zombi: haz clic para despertarlo');
    cy.get('[data-zombie-eye]').closest('a').should('not.exist');
    cy.get('[data-zombie-eye] svg').should('have.attr', 'aria-hidden', 'true');
    cy.visitPage('/en/', { lang: 'en' });
    cy.get('[data-zombie-eye]').should('have.attr', 'aria-label', 'Zombie eye: click to wake it up');
  });

  it('always watches the pointer: iris and lids follow it', () => {
    cy.visitPage('/bo3/the-giant/', { mouse: true });
    pointAt(600, 0);
    eyeVar('--gx', (v) => expect(v).to.be.greaterThan(6));
    eyeVar('--gy', (v) => expect(v).to.eq(0));
    pointAt(-600, 0);
    eyeVar('--gx', (v) => expect(v).to.be.lessThan(-6));
    pointAt(0, 500);
    eyeVar('--gy', (v) => expect(v).to.be.greaterThan(3));
    eyeVar('--lid-top', (v) => expect(v).to.be.greaterThan(0));
    pointAt(0, -500);
    eyeVar('--lid-top', (v) => expect(v).to.be.lessThan(0));
    // The iris really moves on screen.
    cy.get('.ze-iris').should(($i) => expect(getComputedStyle($i[0]).transform).to.not.eq('none'));
  });

  it('keeps watching after moving to another page', () => {
    cy.visitPage('/');
    cy.get('.site-header a.chip[href="/historia/"]').click();
    cy.location('pathname').should('eq', '/historia/');
    pointAt(600, 0);
    eyeVar('--gx', (v) => expect(v).to.be.greaterThan(6));
  });

  it('blinks on its own', () => {
    cy.clock();
    cy.visitPage('/');
    cy.get('[data-zombie-eye]').then(($e) => {
      const seen: string[] = [];
      new MutationObserver(() => $e[0].classList.contains('is-blinking') && seen.push('blink')).observe($e[0], { attributes: true });
      cy.wrap(seen).as('blinks');
    });
    cy.tick(7000);
    cy.get('@blinks').should('have.length.at.least', 1);
  });

  it('a click shakes it and, with sound on, growls with an echo, without leaving the page', () => {
    cy.visitPage('/misiones/', { sound: true });
    recordSamples();
    cy.get('[data-zombie-eye]').click();
    cy.location('pathname').should('eq', '/misiones/');
    cy.get('[data-zombie-eye]').should('have.class', 'is-raging');
    cy.get('[data-zombie-eye] .ze').should(($s) => expect(getComputedStyle($s[0]).animationName).to.eq('eye-shake'));
    cy.get('@played')
      .should('have.length', 1)
      .its(0)
      .should((p: Played) => {
        expect(p.src).to.eq(ZOMBIE);
        expect(p.volume).to.be.within(0.5, 1);
        expect(p.echo).to.include.keys('delay', 'feedback', 'wet');
        expect(p.echo!.feedback).to.be.lessThan(1);
      });
    // It calms down by itself.
    cy.get('[data-zombie-eye]').should('not.have.class', 'is-shaking').and('not.have.class', 'is-raging');
  });

  it('works from the keyboard', () => {
    cy.visitPage('/', { sound: true });
    recordSamples();
    cy.get('[data-zombie-eye]').focus().should('have.focus');
    cy.focused().type('{enter}');
    cy.get('[data-zombie-eye]').should('have.class', 'is-raging');
    cy.get('@played').should('have.length', 1);
  });

  it('with sound off it still shakes, but stays silent', () => {
    cy.visitPage('/');
    recordSamples();
    cy.get('[data-zombie-eye]').click();
    cy.get('[data-zombie-eye]').should('have.class', 'is-raging');
    cy.wait(300);
    cy.get('@played').should('have.length', 0);
  });

  it('with reduced motion it does not move, blink or shake (the growl still works)', () => {
    cy.clock();
    cy.visitPage('/', { reducedMotion: true, sound: true });
    recordSamples();
    pointAt(600, 200);
    cy.wait(150); // a few real frames: the iris would have moved by now
    cy.tick(10_000);
    cy.get('[data-zombie-eye]').should('not.have.class', 'is-blinking');
    eyeVar('--gx', (v) => expect(v).to.eq(0));
    cy.get('[data-zombie-eye]').click();
    cy.get('[data-zombie-eye]').should('have.class', 'is-raging').and('not.have.class', 'is-shaking');
    cy.get('@played').should('have.length', 1);
  });

  it('the loading screen has the eye too: shut while loading, awake at 100%', () => {
    cy.visitPage('/', { intro: true });
    cy.get('.intro .intro-atom').should('not.exist');
    cy.get('.intro .intro-eye').should('be.visible').and('have.attr', 'data-asleep');
    cy.get('.intro .intro-eye').should(($e) => expect(Number($e[0].style.getPropertyValue('--wake-top'))).to.be.greaterThan(5));
    cy.get('.intro.is-ready', { timeout: 10000 }).should('exist');
    cy.get('.intro .intro-eye').should('not.have.attr', 'data-asleep');
    cy.get('.intro .intro-eye').should(($e) => expect($e[0].style.getPropertyValue('--wake-top')).to.eq('0'));
    // It watches the pointer from the loading screen as well.
    cy.get('.intro .intro-eye').then(($e) => {
      const r = $e[0].getBoundingClientRect();
      cy.document().trigger('pointermove', { clientX: r.right + 600, clientY: r.top + r.height / 2 });
    });
    cy.get('.intro .intro-eye').should(($e) => expect(Number($e[0].style.getPropertyValue('--gx'))).to.be.greaterThan(6));
    // Two eyes on the page, but each SVG id (gradients, clip) exists only once.
    cy.document().then((doc) => {
      const ids = [...doc.querySelectorAll('.zombie-eye [id]')].map((el) => el.id);
      expect(ids).to.have.length.at.least(14);
      for (const id of ids) expect(doc.querySelectorAll(`[id="${id}"]`), id).to.have.length(1);
    });
    cy.get('[data-intro-enter="off"]').click();
    cy.get('.intro').should('not.exist');
    cy.get('.site-header [data-zombie-eye]').should('be.visible');
  });

  it('the favicon is the zombie eye', () => {
    cy.visitPage('/');
    cy.get('link[rel="icon"]').should('have.attr', 'href', '/favicon.svg');
    cy.request('/favicon.svg').its('body').should('contain', 'id="zombie-eye"').and('not.contain', '<text').and('not.contain', 'r="31"');
  });

  it('fits the header on a phone', () => {
    cy.viewport(375, 667);
    cy.visitPage('/');
    cy.get('[data-zombie-eye]').should('be.visible');
    cy.document().its('documentElement.scrollWidth').should('be.lte', 375);
  });
});

describe('Background music and other tabs', () => {
  const setHidden = (hidden: boolean) =>
    cy.document().then((doc) => {
      Object.defineProperty(doc, 'hidden', { configurable: true, get: () => hidden });
      Object.defineProperty(doc, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
      doc.dispatchEvent(new Event('visibilitychange'));
    });

  it('fades out slowly in the background, pauses, and comes back when you return', () => {
    cy.visitPage('/', { sound: true });
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0.3').and('have.prop', 'paused', false);
    setHidden(true);
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0').and('have.attr', 'data-away', 'true');
    // Still playing while it fades (not cut off at once)…
    cy.get('audio[data-music]').should('have.prop', 'paused', false);
    // …then paused once the fade is over.
    cy.get('audio[data-music]', { timeout: 5000 }).should('have.prop', 'paused', true);
    setHidden(false);
    cy.get('audio[data-music]').should('have.prop', 'paused', false).and('have.attr', 'data-volume', '0.3').and('have.attr', 'data-away', 'false');
  });

  it('a quick look at another tab does not pause it', () => {
    cy.visitPage('/', { sound: true });
    cy.get('audio[data-music]').should('have.prop', 'paused', false);
    setHidden(true);
    cy.wait(500);
    setHidden(false);
    cy.wait(3000);
    cy.get('audio[data-music]').should('have.prop', 'paused', false).and('have.attr', 'data-volume', '0.3');
  });
});
