// Build-time defaults per host. Explicit variables always win; otherwise the
// values are derived from what the host exposes (Vercel's system variables).

/**
 * @param {Record<string, string | undefined>} env usually process.env
 * @returns {{ BASE_PATH: string, SITE_URL: string, PUBLIC_REPO_URL: string }}
 */
export function hostingDefaults(env) {
  const vercelDomain = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const vercelRepo =
    env.VERCEL_GIT_PROVIDER === 'github' && env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG
      ? `https://github.com/${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`
      : '';

  return {
    BASE_PATH: env.BASE_PATH || '/',
    SITE_URL: env.SITE_URL || (vercelDomain ? `https://${vercelDomain}` : 'http://localhost:4321'),
    PUBLIC_REPO_URL: env.PUBLIC_REPO_URL || vercelRepo,
  };
}
