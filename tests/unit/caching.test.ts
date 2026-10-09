// Browser caching: hashed build files are cached for good, every static
// folder in public/ for a month, on Vercel and in the Docker image (nginx).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface Rule {
  source: string;
  headers: { key: string; value: string }[];
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Rule[] };
const nginx = readFileSync('nginx.conf', 'utf8');
const folders = readdirSync('public').filter((f) => statSync(join('public', f)).isDirectory());

const cacheControl = (source: string) => vercel.headers.find((r) => r.source === source)?.headers.find((h) => h.key === 'Cache-Control')?.value ?? '';
const maxAge = (value: string) => Number(/max-age=(\d+)/.exec(value)?.[1] ?? 0);

describe('browser caching', () => {
  it('Vercel caches hashed build files forever', () => {
    expect(cacheControl('/_astro/(.*)')).toMatch(/immutable/);
    expect(maxAge(cacheControl('/_astro/(.*)'))).toBe(31536000);
  });

  it('Vercel caches every public/ folder (images, sounds…) for at least a month', () => {
    expect(folders).toEqual(expect.arrayContaining(['images', 'sounds']));
    for (const folder of folders) expect(maxAge(cacheControl(`/${folder}/(.*)`)), folder).toBeGreaterThanOrEqual(30 * 24 * 3600);
  });

  it('nginx (Docker) does the same', () => {
    expect(nginx).toMatch(/location \/_astro\/ \{\s*expires 1y;\s*add_header Cache-Control "public, immutable";/);
    for (const folder of folders) expect(nginx, folder).toMatch(new RegExp(`location /${folder}/ \\{\\s*expires 30d;`));
  });

  it('pages themselves are not cached, so new content shows up at once', () => {
    expect(vercel.headers.find((r) => r.source === '/(.*)')?.headers.some((h) => h.key === 'Cache-Control')).toBe(false);
  });
});
