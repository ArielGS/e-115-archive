// Search engine helpers: sitemap, robots.txt and schema.org structured data.
// Pure functions (no Astro imports) so the unit tests can check the output.

export interface SitemapEntry {
  /** Absolute URL of the page. */
  loc: string;
  /** The same page in every language, as absolute URLs (hreflang alternates). */
  alternates?: Record<string, string>;
  /** Language whose URL serves as hreflang="x-default". */
  xDefault?: string;
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
export const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);

/** sitemap.xml with xhtml:link hreflang alternates, the format Google documents for multilingual sites. */
export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map(({ loc, alternates = {}, xDefault }) => {
    const links = Object.entries(alternates).map(
      ([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}"/>`,
    );
    if (xDefault && alternates[xDefault]) {
      links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(alternates[xDefault])}"/>`);
    }
    return ['  <url>', `    <loc>${escapeXml(loc)}</loc>`, ...links, '  </url>'].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** robots.txt: everything may be crawled; points crawlers at the sitemap. */
export function robotsTxt(sitemapUrl: string): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemapUrl}`, ''].join('\n');
}

/**
 * Serialises structured data for a <script type="application/ld+json">.
 * "<" is escaped so text such as "</script>" can never close the tag.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })),
  };
}

export function website(opts: { name: string; url: string; description: string; lang: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: opts.name,
    url: opts.url,
    description: opts.description,
    inLanguage: opts.lang,
  };
}

export function article(opts: { headline: string; description: string; url: string; image?: string; lang: string; site: string; siteUrl: string; about?: string }) {
  const publisher = { '@type': 'Organization', name: opts.site, url: opts.siteUrl };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    inLanguage: opts.lang,
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
    url: opts.url,
    ...(opts.image ? { image: [opts.image] } : {}),
    ...(opts.about ? { about: { '@type': 'VideoGame', name: opts.about } } : {}),
    author: publisher,
    publisher,
  };
}
