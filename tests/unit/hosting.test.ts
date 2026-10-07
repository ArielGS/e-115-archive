import { describe, expect, it } from 'vitest';
import { hostingDefaults, OFFICIAL_REPO } from '../../src/lib/hosting.mjs';

describe('hostingDefaults', () => {
  it('local development: root path, localhost, links to the official repository', () => {
    expect(OFFICIAL_REPO).toBe('https://github.com/ArielGS/e-115-archive');
    expect(hostingDefaults({})).toEqual({ BASE_PATH: '/', SITE_URL: 'http://localhost:4321', PUBLIC_REPO_URL: OFFICIAL_REPO });
  });

  it('Vercel: production domain and GitHub repo come from system variables', () => {
    expect(
      hostingDefaults({
        VERCEL_PROJECT_PRODUCTION_URL: 'e-115-archive.vercel.app',
        VERCEL_URL: 'e-115-archive-git-x.vercel.app',
        VERCEL_GIT_PROVIDER: 'github',
        VERCEL_GIT_REPO_OWNER: 'someone',
        VERCEL_GIT_REPO_SLUG: 'archivo-115',
      }),
    ).toEqual({ BASE_PATH: '/', SITE_URL: 'https://e-115-archive.vercel.app', PUBLIC_REPO_URL: 'https://github.com/someone/archivo-115' });
  });

  it('falls back to the deployment URL and ignores non-GitHub repos', () => {
    const env = hostingDefaults({ VERCEL_URL: 'preview.vercel.app', VERCEL_GIT_PROVIDER: 'gitlab', VERCEL_GIT_REPO_OWNER: 'a', VERCEL_GIT_REPO_SLUG: 'b' });
    expect(env.SITE_URL).toBe('https://preview.vercel.app');
    expect(env.PUBLIC_REPO_URL).toBe(OFFICIAL_REPO);
  });

  it('explicit variables always win (GitHub Pages, custom domains)', () => {
    expect(
      hostingDefaults({ BASE_PATH: '/archivo-115/', SITE_URL: 'https://archivo115.com', PUBLIC_REPO_URL: 'https://github.com/me/x', VERCEL_URL: 'y.vercel.app' }),
    ).toEqual({ BASE_PATH: '/archivo-115/', SITE_URL: 'https://archivo115.com', PUBLIC_REPO_URL: 'https://github.com/me/x' });
  });
});
