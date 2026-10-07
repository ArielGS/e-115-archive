// Crawls every page: all images load, every internal link resolves, every
// image has alt text, and the 404 page works.
const PAGES = [
  '/',
  '/creditos/',
  '/contribuir/',
  '/bo3/shadows-of-evil/',
  '/bo3/the-giant/',
  '/bo3/der-eisendrache/',
  '/bo3/zetsubou-no-shima/',
  '/bo1/moon/',
  '/bo2/mob-of-the-dead/',
  '/en/',
  '/en/credits/',
  '/en/contribute/',
  '/en/bo3/shadows-of-evil/',
  '/en/bo3/the-giant/',
  '/en/bo3/der-eisendrache/',
  '/en/bo1/moon/',
];
const langOf = (path: string) => (path.startsWith('/en/') ? 'en' : 'es');

describe('Site integrity', () => {
  PAGES.forEach((path) => {
    it(`${path}: images load and have alt text`, () => {
      cy.visitPage(path, { lang: langOf(path) });
      // Reveal everything so images inside spoilers are checked too.
      cy.document().then((doc) => doc.querySelectorAll('[data-spoiler]').forEach((b) => b.classList.add('is-open')));
      cy.document().then((doc) => {
        doc.querySelectorAll('img').forEach((img) => {
          expect(img.hasAttribute('alt'), `alt on ${img.src}`).to.be.true;
          img.loading = 'eager';
          cy.wrap(img).should(() => {
            expect(img.complete && img.naturalWidth, `loaded ${img.src}`).to.be.greaterThan(0);
          });
        });
      });
    });

    it(`${path}: internal links resolve`, () => {
      cy.visitPage(path, { lang: langOf(path) });
      cy.get('a[href]').then(($a) => {
        const hrefs = [...new Set([...$a].map((a) => (a as HTMLAnchorElement).href))].filter(
          (h) => h.startsWith(Cypress.config('baseUrl')!) && !h.includes('#'),
        );
        hrefs.forEach((href) => cy.request(href).its('status').should('eq', 200));
      });
    });
  });

  (['es', 'en'] as const).forEach((lang) => {
    it(`every map in the ${lang} tabs has a working page in the same language`, () => {
      cy.visitPage(lang === 'en' ? '/en/' : '/', { lang });
      cy.get('.map-card').should('have.length', 18).each(($a) => {
        cy.request(($a[0] as HTMLAnchorElement).href).its('body').should('contain', `<html lang="${lang}"`);
      });
    });
  });

  it('the credits page lists every image with its source', () => {
    cy.visitPage('/creditos/');
    cy.get('.credits-table tbody tr').should('have.length.at.least', 90);
    cy.get('.credits-table tbody a').first().should('have.attr', 'href').and('match', /fandom\.com\/wiki\/File:/);
  });

  it('unknown pages show the custom 404', () => {
    cy.request({ url: '/no-existe/', failOnStatusCode: false }).its('status').should('eq', 404);
    cy.visit('/404.html');
    cy.contains('Te saliste del mapa');
  });

});
