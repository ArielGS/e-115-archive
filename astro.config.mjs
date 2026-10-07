import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkZombies from './src/lib/remark-zombies.ts';
import { hostingDefaults } from './src/lib/hosting.mjs';

// Fills SITE_URL / PUBLIC_REPO_URL from the host when they are not set
// (Vercel exposes its production domain and Git repository at build time).
const env = hostingDefaults(process.env);
Object.assign(process.env, env);

// BASE_PATH lets the same build run at the domain root (Vercel, Docker,
// Netlify, Cloudflare Pages) or under a sub-path (GitHub Pages: "/<repo>/").
const base = env.BASE_PATH;

export default defineConfig({
  site: env.SITE_URL,
  base,
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkDirective, [remarkZombies, { base }]],
    }),
  },
});
