// Phones and tablets: no sideways scrolling, nothing cut off, everything
// reachable and tappable.
const DEVICES: [string, number, number][] = [
  ['iPhone SE', 375, 667],
  ['iPhone 14', 390, 844],
  ['Pixel 7', 412, 915],
  ['iPad mini', 768, 1024],
  ['iPad Air landscape', 1180, 820],
  ['iPad Pro portrait', 1024, 1366],
];

const PAGES = ['/', '/historia/', '/bo3/shadows-of-evil/', '/en/bo3/der-eisendrache/', '/waw/nacht-der-untoten/', '/bo2/tranzit/', '/bo2/origins/', '/creditos/'];

const lang = (path: string) => (path.startsWith('/en/') ? 'en' : 'es');

/** Asserts no element sticks out of the viewport (except inside scroll areas). */
function assertFitsWidth(width: number) {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(width);
    const offenders = [...doc.querySelectorAll<HTMLElement>('main *, header *, footer *')]
      .filter((el) => {
        if (el.closest('.main-nav, .ticker, .toc ol, .hud[style*="overflow"], .hero-bg, .era-banner, .tabs')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.right > width + 1 || r.left < -1);
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
    expect(offenders, 'elements outside the screen').to.deep.equal([]);
  });
}

describe('Responsive layout', () => {
  DEVICES.forEach(([device, w, h]) => {
    describe(`${device} (${w}×${h})`, () => {
      beforeEach(() => cy.viewport(w, h));

      PAGES.forEach((path) => {
        it(`${path} fits the screen`, () => {
          cy.visitPage(path, { lang: lang(path) });
          assertFitsWidth(w);
          cy.get('h1').then(($h) => {
            const r = $h[0].getBoundingClientRect();
            expect(r.right, 'title fits').to.be.at.most(w + 1);
          });
          // Body text stays readable.
          cy.get('main p').first().should(($p) => {
            expect(parseFloat(getComputedStyle($p[0]).fontSize)).to.be.at.least(15);
          });
        });
      });

      it('home: tabs, cards and navigation are usable', () => {
        cy.visitPage('/');
        cy.get('#tab-bo1').scrollIntoView().click();
        cy.get('#panel-bo1').should('be.visible');
        cy.get('#panel-bo1 .map-card').first().should(($c) => {
          const r = $c[0].getBoundingClientRect();
          expect(r.width, 'card width').to.be.at.least(Math.min(260, w - 60));
          expect(r.right).to.be.at.most(w + 1);
        });
        // Every header link can be reached (the nav scrolls sideways on phones).
        cy.get('.main-nav a, .main-nav button').each(($el) => {
          cy.wrap($el).scrollIntoView().should('be.visible');
        });
        assertFitsWidth(w);
      });

      it('guide: spoilers and narrator fit and are tappable', () => {
        cy.visitPage('/bo3/shadows-of-evil/', { speech: true });
        cy.get('#margwa [data-spoiler-toggle]').scrollIntoView().should(($b) => {
          expect($b[0].getBoundingClientRect().height, 'tap target').to.be.at.least(32);
        });
        cy.get('#margwa [data-spoiler-toggle]').click();
        cy.get('#margwa [data-spoiler-accept]').should('be.visible').click();
        cy.get('#margwa .dossier-photo img').should('be.visible');
        assertFitsWidth(w);

        cy.get('.narrator-fab').click();
        cy.get('[data-narrator]').should('be.visible').and(($n) => {
          const r = $n[0].getBoundingClientRect();
          expect(r.left, 'narrator left').to.be.at.least(0);
          expect(r.right, 'narrator right').to.be.at.most(w);
          expect(r.top, 'narrator top').to.be.at.least(0);
          expect(r.bottom, 'narrator bottom').to.be.at.most(h);
        });
        cy.get('[data-n-play]').should('be.visible');

        // Minimised, the narrator is a compact bar that still fits the screen.
        cy.get('[data-n-min]').click();
        cy.get('[data-narrator]').should('have.class', 'is-min').and(($n) => {
          const r = $n[0].getBoundingClientRect();
          expect(r.left, 'mini narrator left').to.be.at.least(0);
          expect(r.right, 'mini narrator right').to.be.at.most(w);
          expect(r.bottom, 'mini narrator bottom').to.be.at.most(h);
          expect(r.height, 'mini narrator height').to.be.lessThan(h / 3);
        });
        cy.get('[data-n-play]').should('be.visible');
        cy.get('[data-n-min]').should(($b) => {
          expect($b[0].getBoundingClientRect().height, 'tap target').to.be.at.least(24);
        });
      });
    });
  });
});
