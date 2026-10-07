// /sitemap.xml: every indexable page in both languages, with hreflang
// alternates. Pending map entries (status: stub) are left out: they are
// noindex until their guide is written.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LANGS, DEFAULT_LANG, localePath, pagePath, type PageKey } from '../i18n/ui';
import { entryLang, mapKey } from '../lib/maps';
import { url } from '../lib/site';
import { sitemapXml, type SitemapEntry } from '../lib/seo';

const PAGES: PageKey[] = ['story', 'quests', 'contribute', 'credits'];

export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(url(path), site).href;
  /** One <url> per language, each listing all the languages. */
  const group = (pathFor: (lang: (typeof LANGS)[number]) => string): SitemapEntry[] => {
    const alternates = Object.fromEntries(LANGS.map((l) => [l, abs(pathFor(l))]));
    return LANGS.map((l) => ({ loc: alternates[l], alternates, xDefault: DEFAULT_LANG }));
  };

  const guides = (await getCollection('maps', (m) => entryLang(m) === DEFAULT_LANG && m.data.status === 'guide')).map(mapKey).sort();
  const entries = [
    ...group((l) => localePath(l, '/')),
    ...PAGES.flatMap((page) => group((l) => pagePath(l, page))),
    ...guides.flatMap((key) => group((l) => localePath(l, `/${key}/`))),
  ];
  return new Response(sitemapXml(entries), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
