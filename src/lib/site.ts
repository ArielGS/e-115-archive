// Site-wide settings. PUBLIC_REPO_URL lets forks point "edit this page" and
// "contribute" links at their own repository. The site name depends on the
// language ("Archivo 115" / "Archive 115"): use t(lang, 'site.name').
export const SITE = {
  /** Empty until set in .env — repo links are hidden while it is empty. */
  repo: (import.meta.env.PUBLIC_REPO_URL ?? '').replace(/\/+$/, ''),
  version: 'v1.15',
};

/** Prefixes the configured base path (e.g. "/archivo-115/") to a root path. */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (!path.startsWith('/')) return path;
  return base + path || '/';
}

export const editUrl = (contentPath: string) => (SITE.repo ? `${SITE.repo}/edit/main/${contentPath}` : '');
