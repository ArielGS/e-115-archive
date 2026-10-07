// What search engines see: sitemap, robots.txt, canonical/hreflang tags,
// structured data, noindex on thin pages, and no language redirect for bots.
const GOOGLEBOT =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** Sitemap URLs use the build's SITE_URL; test them against the server under test. */
const local = (href: string) => {
  const u = new URL(href);
  return u.pathname + u.search;
};

const head = (selector: string) => cy.document().then((doc) => doc.head.querySelectorAll(selector));

describe('Search engines', () => {
  it('robots.txt allows crawling and points to the sitemap', () => {
    cy.request('/robots.txt').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.match(/User-agent: \*/);
      expect(res.body).not.to.match(/Disallow: \//);
      expect(res.body).to.match(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
    });
  });

  it('the sitemap lists every guide and page in both languages, and every URL works', () => {
    cy.request('/sitemap.xml').then((res) => {
      expect(res.status).to.eq(200);
      const doc = new DOMParser().parseFromString(res.body, 'application/xml');
      expect(doc.querySelector('parsererror')).to.eq(null);
      const locs = [...doc.getElementsByTagName('loc')].map((l) => local(l.textContent!));
      ['/', '/en/', '/historia/', '/en/story/', '/waw/nacht-der-untoten/', '/en/bo1/kino-der-toten/', '/bo2/tranzit/', '/bo3/the-giant/', '/misiones/', '/en/quests/', '/bo4/blood-of-the-dead/'].forEach(
        (path) => expect(locs, path).to.include(path),
      );
      // Pending map entries are not offered to search engines.
      expect(locs).not.to.include('/bo2/origins/');
      locs.forEach((path) => cy.request(path).its('status').should('eq', 200));
    });
  });

  it('a guide has a canonical URL, hreflang alternates, social cards and structured data', () => {
    cy.visitPage('/bo1/kino-der-toten/');
    cy.title().should('eq', 'Guía de Kino der Toten · Black Ops Zombies · Archivo 115');
    head('link[rel="canonical"]').should('have.length', 1).then(($l) => expect($l[0].getAttribute('href')).to.match(/\/bo1\/kino-der-toten\/$/));
    head('link[rel="alternate"][hreflang]').then(($l) => {
      const langs = [...$l].map((l) => l.getAttribute('hreflang'));
      expect(langs).to.deep.equal(['es', 'en', 'x-default']);
    });
    head('meta[name="robots"]').then(($m) => expect($m[0].getAttribute('content')).to.contain('index, follow'));
    head('meta[name="description"]').then(($m) => expect($m[0].getAttribute('content')).to.contain('Kino der Toten'));
    head('meta[property="og:type"]').then(($m) => expect($m[0].getAttribute('content')).to.eq('article'));
    head('meta[property="og:image"]').then(($m) => expect($m[0].getAttribute('content')).to.match(/^https?:\/\/.+\.webp$/));
    head('meta[name="twitter:card"]').then(($m) => expect($m[0].getAttribute('content')).to.eq('summary_large_image'));
    head('script[type="application/ld+json"]').then(($s) => {
      const types = [...$s].map((s) => JSON.parse(s.textContent!)['@type']);
      expect(types).to.deep.equal(['Article', 'BreadcrumbList']);
    });
  });

  it('the home page describes the website, and the story page is an article', () => {
    cy.visitPage('/en/', { lang: 'en' });
    head('script[type="application/ld+json"]').then(($s) => expect(JSON.parse($s[0].textContent!)).to.include({ '@type': 'WebSite', inLanguage: 'en' }));
    cy.visitPage('/historia/');
    cy.title().should('contain', 'Historia de Call of Duty Zombies');
    head('script[type="application/ld+json"]').then(($s) => expect(JSON.parse($s[0].textContent!)['@type']).to.eq('Article'));
  });

  it('pending map entries and the 404 page stay out of search results', () => {
    cy.visitPage('/bo2/origins/');
    head('meta[name="robots"]').then(($m) => expect($m[0].getAttribute('content')).to.eq('noindex, follow'));
    head('link[rel="canonical"]').should('have.length', 0);
    cy.visit('/404.html');
    head('meta[name="robots"]').then(($m) => expect($m[0].getAttribute('content')).to.eq('noindex, follow'));
  });

  it('Googlebot is never redirected to another language, so both get indexed', () => {
    // An English browser would be sent to /en/ (language.cy.ts); a crawler must stay.
    cy.browserLanguages(['en-US']);
    cy.visit('/bo3/the-giant/', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', { value: GOOGLEBOT, configurable: true });
        Object.defineProperty(win.navigator, 'languages', { value: ['en-US', 'en'], configurable: true });
      },
    });
    cy.window().its('navigator.userAgent').should('contain', 'Googlebot');
    cy.wait(300);
    cy.location('pathname').should('eq', '/bo3/the-giant/');
    cy.get('html').should('have.attr', 'lang', 'es');
  });
});
