// Front matter schemas for src/content. Shared by Astro (content.config.ts)
// and the unit tests, so a broken Markdown file fails both the build and CI.
import { z } from 'astro/zod';

/** Absolute path to a file in /public/images. */
const imagePath = z.string().regex(/^\/images\/.+\.(webp|png|jpe?g|svg)$/, 'must look like /images/<path>.webp');

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** World at War first, then the three Black Ops games: story order. */
export const ERA_IDS = ['waw', 'bo1', 'bo2', 'bo3'] as const;

export const eraSchema = z.object({
  title: z.string(),
  code: z.string().max(4),
  year: z.number().int(),
  order: z.number().int(),
  tagline: z.string(),
  hero: imagePath,
  accent: hexColor,
  crew: z
    .array(z.object({ name: z.string(), note: z.string(), img: imagePath.optional() }))
    .default([]),
});

export const mapSchema = z.object({
  title: z.string(),
  era: z.enum(ERA_IDS),
  order: z.number().int(),
  status: z.enum(['guide', 'stub']),
  released: z.string().regex(/^\d{4}(-\d{2}-\d{2})?$/),
  setting: z.string(),
  tagline: z.string(),
  thumb: imagePath,
  hero: imagePath.optional(),
  accent: hexColor.default('#ff7a18'),
  ambient: z.enum(['noir', 'factory', 'castle', 'default']).default('default'),
  difficulty: z.number().int().min(1).max(5).optional(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  /** One line the voice narrator says before reading the guide. */
  intro: z.string().optional(),
});

export const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  /** Header image, for pages with their own hero (the story page). */
  hero: imagePath.optional(),
  /** One line the voice narrator says before reading the page. */
  intro: z.string().optional(),
});

export type Era = z.infer<typeof eraSchema>;
export type MapData = z.infer<typeof mapSchema>;
