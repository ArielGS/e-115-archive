// Site-wide settings. PUBLIC_REPO_URL lets forks point "edit this page" and
// "contribute" links at their own repository. The site name depends on the
// language ("Archivo 115" / "Archive 115"): use t(lang, 'site.name').
export const SITE = {
  /** Defaults to the official repository (src/lib/hosting.mjs); forks override it in .env. */
  repo: (import.meta.env.PUBLIC_REPO_URL ?? '').replace(/\/+$/, ''),
  version: 'v1.15',
};

/**
 * Search engine ownership tokens (free): paste the code Google Search Console
 * or Bing Webmaster Tools gives for the "HTML tag" method. Empty = no tag.
 */
export const SEO = {
  google: (import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION ?? '').trim(),
  bing: (import.meta.env.PUBLIC_BING_SITE_VERIFICATION ?? '').trim(),
};

/** Prefixes the configured base path (e.g. "/archivo-115/") to a root path. */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (!path.startsWith('/')) return path;
  return base + path || '/';
}

export const editUrl = (contentPath: string) => (SITE.repo ? `${SITE.repo}/edit/main/${contentPath}` : '');
