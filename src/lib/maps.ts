import type { CollectionEntry } from 'astro:content';
import { localePath, type Lang } from '../i18n/ui';

export type MapEntry = CollectionEntry<'maps'>;
export type EraEntry = CollectionEntry<'eras'>;

/** "en/bo3/shadows-of-evil" -> { lang: "en", era: "bo3", slug: "shadows-of-evil" } */
export function splitId(id: string): { lang: Lang; era: string; slug: string } {
  const [lang, era, ...rest] = id.split('/');
  return { lang: lang as Lang, era, slug: rest.join('/') };
}

/** Language-independent key, e.g. "bo3/the-giant" (also used for spoiler progress). */
export const mapKey = (entry: MapEntry) => entry.id.split('/').slice(1).join('/');

export const entryLang = (entry: { id: string }) => entry.id.split('/')[0] as Lang;

/** Id without the language prefix: "es/bo1" -> "bo1". */
export const baseId = (entry: { id: string }) => entry.id.split('/').slice(1).join('/');

export const mapPath = (entry: MapEntry) => localePath(entryLang(entry), `/${mapKey(entry)}/`);

export function byOrder<T extends { data: { order: number } }>(a: T, b: T): number {
  return a.data.order - b.data.order;
}

export function neighbours(all: MapEntry[], current: MapEntry) {
  const lang = entryLang(current);
  const siblings = all.filter((m) => entryLang(m) === lang && m.data.era === current.data.era).sort(byOrder);
  const i = siblings.findIndex((m) => m.id === current.id);
  return { prev: siblings[i - 1], next: siblings[i + 1] };
}
