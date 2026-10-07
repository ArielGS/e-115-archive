// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { article, breadcrumbs, escapeXml, jsonLd, robotsTxt, sitemapXml, website } from '../../src/lib/seo';

const SITE = 'https://e-115-archive.vercel.app';

describe('sitemapXml', () => {
  const alternates = { es: `${SITE}/bo3/the-giant/`, en: `${SITE}/en/bo3/the-giant/` };
  const xml = sitemapXml([
    { loc: alternates.es, alternates, xDefault: 'es' },
    { loc: alternates.en, alternates, xDefault: 'es' },
  ]);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  it('is valid XML in the sitemap namespace', () => {
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect([...doc.getElementsByTagName('loc')].map((l) => l.textContent)).toEqual([alternates.es, alternates.en]);
  });

  it('lists every language and an x-default for each page', () => {
    const links = [...doc.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')];
    expect(links).toHaveLength(6);
    const first = links.slice(0, 3).map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')]);
    expect(first).toEqual([
      ['es', alternates.es],
      ['en', alternates.en],
      ['x-default', alternates.es],
    ]);
  });

  it('escapes special characters', () => {
    expect(escapeXml(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;');
    expect(sitemapXml([{ loc: `${SITE}/?a=1&b=2` }])).toContain('<loc>https://e-115-archive.vercel.app/?a=1&amp;b=2</loc>');
  });
});

describe('robotsTxt', () => {
  it('allows everything and points at the sitemap', () => {
    const txt = robotsTxt(`${SITE}/sitemap.xml`);
    expect(txt).toMatch(/^User-agent: \*\nAllow: \/\n/);
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(txt).not.toMatch(/Disallow/);
  });
});

describe('structured data', () => {
  it('serialises JSON-LD that cannot close its <script> tag', () => {
    const out = jsonLd({ headline: 'A </script><b>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out)).toEqual({ headline: 'A </script><b>' });
  });

  it('builds breadcrumbs with 1-based positions', () => {
    const list = breadcrumbs([
      { name: 'Archivo 115', url: `${SITE}/` },
      { name: 'Black Ops II', url: `${SITE}/#bo2` },
      { name: 'TranZit', url: `${SITE}/bo2/tranzit/` },
    ]);
    expect(list['@type']).toBe('BreadcrumbList');
    expect(list.itemListElement.map((i) => [i.position, i.name])).toEqual([
      [1, 'Archivo 115'],
      [2, 'Black Ops II'],
      [3, 'TranZit'],
    ]);
  });

  it('describes guides as articles about the game, and the home as a website', () => {
    const a = article({
      headline: 'Guía de TranZit · Black Ops II Zombies',
      description: 'Guía sin spoilers.',
      url: `${SITE}/bo2/tranzit/`,
      image: `${SITE}/images/maps/bo2/tranzit/hero.webp`,
      lang: 'es',
      site: 'Archivo 115',
      siteUrl: `${SITE}/`,
      about: 'Call of Duty: Black Ops II',
    });
    expect(a).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      inLanguage: 'es',
      image: [`${SITE}/images/maps/bo2/tranzit/hero.webp`],
      about: { '@type': 'VideoGame', name: 'Call of Duty: Black Ops II' },
      publisher: { '@type': 'Organization', name: 'Archivo 115' },
      mainEntityOfPage: { '@id': `${SITE}/bo2/tranzit/` },
    });
    expect(website({ name: 'Archive 115', url: `${SITE}/en/`, description: 'x', lang: 'en' })).toMatchObject({ '@type': 'WebSite', inLanguage: 'en' });
  });
});
