# Search engines (SEO)

Everything here is free and needs no third-party script.

## What the site already does

| Piece | Where |
| --- | --- |
| `/sitemap.xml` with every indexable page in both languages and `hreflang` alternates (plus `x-default`) | `src/pages/sitemap.xml.ts` |
| `/robots.txt` allowing everything and pointing to the sitemap | `src/pages/robots.txt.ts` |
| Canonical URL, `hreflang` links, Open Graph and Twitter cards on every page | `src/layouts/Base.astro` |
| Search-friendly titles and descriptions for guides ("Guía de TranZit · Black Ops II Zombies") and the story page | `seo.*` keys in `src/i18n/ui.ts` |
| Structured data (JSON-LD): `WebSite` on the home page, `Article` + `BreadcrumbList` on guides and the story, `BreadcrumbList` on other pages | `src/lib/seo.ts` |
| `noindex` on pending map entries (status `stub`) and the 404 page, so thin pages do not count against the site; a stub becomes indexable and enters the sitemap as soon as its guide is written | `MapPage.astro`, `404.astro` |
| Crawlers are never sent to another language by the language detection script (Googlebot browses in English and would otherwise never see the Spanish pages) | `isCrawler` / `detectScript` in `src/i18n/ui.ts` |

Absolute URLs come from `SITE_URL`; on Vercel it is filled automatically from the production domain (`src/lib/hosting.mjs`), so the sitemap and canonical links point to `https://e-115-archive.vercel.app`.

## One-time steps for the maintainer (cannot be done from the code)

1. **Google Search Console** (free): open <https://search.google.com/search-console>, *Add property* → **URL prefix** → `https://e-115-archive.vercel.app/`.
2. Choose the **HTML tag** verification method and copy only the `content` value of the tag Google shows.
3. In Vercel: *Project → Settings → Environment Variables*, add `PUBLIC_GOOGLE_SITE_VERIFICATION` with that value (Production), and redeploy. Then press **Verify** in Search Console.
4. In Search Console, *Sitemaps* → submit `sitemap.xml`.
5. Optional: *URL inspection* → paste the home page and the story page → **Request indexing**, to speed up the first crawl.
6. Optional, for Bing (and engines that use its index, such as DuckDuckGo): <https://www.bing.com/webmasters> can import the site straight from Search Console; otherwise use `PUBLIC_BING_SITE_VERIFICATION` the same way.

Indexing is not instant: Google usually takes from a few days to a few weeks to show a new site. Search Console's *Pages* report shows what has been indexed and why anything was left out.

## When you add content

- New guides enter the sitemap automatically when their `status` is `guide`.
- Keep the `tagline` short and descriptive: it becomes part of the meta description.
- Every image already needs `alt` text and a credit; that also helps image search.
