import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { eraSchema, mapSchema, pageSchema } from './lib/schema';

// Every collection is split by language: src/content/<collection>/<es|en>/…
// Entry ids start with the language ("es/bo3/the-giant"). Files starting
// with "_" are ignored, handy for drafts.
const eras = defineCollection({
  loader: glob({ pattern: '*/[^_]*.md', base: './src/content/eras' }),
  schema: eraSchema,
});

const maps = defineCollection({
  loader: glob({ pattern: '*/*/[^_]*.md', base: './src/content/maps' }),
  schema: mapSchema,
});

const pages = defineCollection({
  loader: glob({ pattern: '*/[^_]*.md', base: './src/content/pages' }),
  schema: pageSchema,
});

export const collections = { eras, maps, pages };
