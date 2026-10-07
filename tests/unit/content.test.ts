// @vitest-environment jsdom
// Validates every Markdown file in src/content the way CI should: schema,
// images (exist + credited), spoiler safety rules and guide completeness.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename, dirname, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { eraSchema, mapSchema, pageSchema } from '../../src/lib/schema';
import credits from '../../src/data/image-credits.json';
import manifest from '../../scripts/images.manifest.json';
import { md, dom } from './helpers';

const ROOT = join(__dirname, '../..');
const CONTENT = join(ROOT, 'src/content');
const PUBLIC = join(ROOT, 'public');
const CREDITS = credits as Record<string, { file: string; page: string }>;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : name.endsWith('.md') && !name.startsWith('_') ? [full] : [];
  });
}

function split(file: string): { data: Record<string, unknown>; body: string } {
  // Normalize CRLF so checkouts with Windows line endings parse the same way.
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  return { data: parseYaml(m[1]) ?? {}, body: m[2] };
}

/** src/content/<collection>/<lang>/… */
const langOf = (rel: string) => rel.split('/')[3] as 'es' | 'en';
/** Path inside the language folder: "bo3/the-giant.md". */
const innerOf = (rel: string) => rel.split('/').slice(4).join('/');

const files = walk(CONTENT).map((path) => {
  // POSIX separators on every OS (path.relative uses "\" on Windows).
  const rel = relative(ROOT, path).split(sep).join('/');
  return { path, rel, lang: langOf(rel), inner: innerOf(rel), collection: rel.split('/')[2], ...split(path) };
});
const maps = files.filter((f) => f.rel.startsWith('src/content/maps/'));
const eras = files.filter((f) => f.rel.startsWith('src/content/eras/'));
const pages = files.filter((f) => f.rel.startsWith('src/content/pages/'));

/** Every /images/... path mentioned in front matter or in directive attributes. */
function imagesIn(file: (typeof files)[number]): string[] {
  const found = new Set<string>();
  const scan = (v: unknown) => {
    if (typeof v === 'string' && v.startsWith('/images/')) found.add(v);
    else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === 'object') Object.values(v).forEach(scan);
  };
  scan(file.data);
  for (const m of file.body.matchAll(/(?:img|src)="(\/images\/[^"]+)"/g)) found.add(m[1]);
  return [...found];
}

describe('content files', () => {
  it('there is content to test, in both languages', () => {
    for (const lang of ['es', 'en']) {
      expect(maps.filter((m) => m.lang === lang).length).toBeGreaterThanOrEqual(30);
      expect(eras.filter((e) => e.lang === lang).map((e) => basename(e.path, '.md')).sort()).toEqual(['bo1', 'bo2', 'bo3', 'bo4', 'waw']);
      expect(pages.filter((p) => p.lang === lang).map((p) => basename(p.path, '.md')).sort()).toEqual(['basics', 'contribute', 'quests', 'story']);
    }
    expect(files.every((f) => f.lang === 'es' || f.lang === 'en'), 'every file lives in an es/ or en/ folder').toBe(true);
  });

  describe.each(files.map((f) => [f.rel, f] as const))('%s', (_rel, file) => {
    it('has valid front matter', () => {
      const schema = file.rel.includes('/maps/') ? mapSchema : file.rel.includes('/eras/') ? eraSchema : pageSchema;
      const result = schema.safeParse(file.data);
      expect(result.success, JSON.stringify(!result.success && result.error.issues)).toBe(true);
    });

    it('only uses images that exist and are credited', () => {
      for (const img of imagesIn(file)) {
        expect(existsSync(join(PUBLIC, img)), `${img} missing in public/`).toBe(true);
        expect(CREDITS[img], `${img} has no entry in src/data/image-credits.json`).toBeDefined();
      }
    });

    it('renders, and keeps spoilers safe', async () => {
      const root = dom(await md(file.body, { lang: file.lang }));
      // Section headings inside a spoiler would leak through the table of contents.
      expect(root.querySelectorAll('[data-spoiler] h2'), 'no ## headings inside spoilers').toHaveLength(0);
      // A locked block must not put the secret in its visible header.
      for (const block of root.querySelectorAll('[data-spoiler]')) {
        expect(block.querySelector('.spoiler-body')).not.toBeNull();
        const head = block.querySelector('.spoiler-head, .dossier-head')!;
        const name = block.querySelector('.dossier-name')?.textContent;
        if (name) expect(head.textContent).not.toContain(name);
      }
    });

    it('does not link to videos', () => {
      expect(file.body).not.toMatch(/youtube\.com|youtu\.be|twitch\.tv/i);
    });
  });
});

describe('maps', () => {
  it('live in the folder of their era and have unique order per era', () => {
    const seen = new Set<string>();
    for (const m of maps) {
      expect(basename(dirname(m.path)), m.rel).toBe(m.data.era);
      const key = `${m.lang}:${m.data.era}:${m.data.order}`;
      expect(seen.has(key), `duplicate order ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('every era has maps', () => {
    for (const era of ['waw', 'bo1', 'bo2', 'bo3', 'bo4']) expect(maps.filter((m) => m.data.era === era).length).toBeGreaterThan(0);
  });

  it('the first three Black Ops III maps have full guides in both languages', () => {
    for (const lang of ['es', 'en']) {
      const guides = maps.filter((m) => m.lang === lang && m.data.era === 'bo3' && m.data.status === 'guide').map((m) => basename(m.path, '.md'));
      expect(guides.sort(), lang).toEqual(['der-eisendrache', 'shadows-of-evil', 'the-giant']);
    }
  });

  it('the first map of World at War, Black Ops and Black Ops II has a full guide in both languages', () => {
    for (const lang of ['es', 'en']) {
      const first = (era: string) => maps.filter((m) => m.lang === lang && m.data.era === era).sort((a, b) => Number(a.data.order) - Number(b.data.order))[0];
      expect(first('waw').inner, lang).toBe('waw/nacht-der-untoten.md');
      expect(first('bo1').inner, lang).toBe('bo1/kino-der-toten.md');
      expect(first('bo2').inner, lang).toBe('bo2/tranzit.md');
      for (const era of ['waw', 'bo1', 'bo2']) expect(first(era).data.status, `${lang} ${era}`).toBe('guide');
    }
  });

  it('Black Ops 4 has a full guide for its first Aether map, Blood of the Dead', () => {
    for (const lang of ['es', 'en']) {
      const botd = maps.find((m) => m.lang === lang && m.inner === 'bo4/blood-of-the-dead.md');
      expect(botd?.data.status, lang).toBe('guide');
    }
  });

  describe.each(maps.filter((m) => m.data.status === 'guide').map((m) => [m.rel, m] as const))('guide %s', (_rel, m) => {
    it('has the expected structure', async () => {
      const root = dom(await md(m.body, { lang: m.lang }));
      const sections = [...root.querySelectorAll('h2')].map((h) => h.textContent);
      expect(sections.length).toBeGreaterThanOrEqual(6);
      const required = {
        es: ['Antes de empezar', 'Dónde estás y quién eres', 'El objetivo', 'Enemigos y jefes'],
        en: ['Before you start', 'Where you are and who you are', 'The objective', 'Enemies and bosses'],
      };
      expect(sections).toEqual(expect.arrayContaining(required[m.lang]));
      expect(root.querySelectorAll('.dossier.spoiler').length, 'at least one locked dossier').toBeGreaterThan(0);
      expect(root.querySelectorAll('section.spoiler--ee').length, 'easter egg behind a spoiler').toBeGreaterThan(0);
      expect(root.querySelectorAll('.narration').length, 'narration-only lines').toBeGreaterThan(0);
      expect(m.data.intro, 'narrator intro').toBeTruthy();
      expect(m.data.hero, 'hero image').toBeTruthy();
    });
  });
});

describe('characters', () => {
  const WIKI = /^https:\/\/callofduty\.fandom\.com\/wiki\/\S+$/;

  it('every playable character in the era tabs has a picture and links to its wiki article', () => {
    for (const era of eras) {
      for (const member of era.data.crew as { name: string; img?: string; wiki?: string }[]) {
        expect(member.img, `${era.rel}: ${member.name} picture`).toBeTruthy();
        expect(member.wiki, `${era.rel}: ${member.name} wiki link`).toMatch(WIKI);
      }
    }
  });

  it('every portrait card in the guides and the story links to the wiki', async () => {
    for (const file of [...maps, ...pages]) {
      const root = dom(await md(file.body, { lang: file.lang }));
      for (const img of root.querySelectorAll('.card img[src*="/images/characters/"]')) {
        const card = img.closest('.card')!;
        expect(card.tagName, `${file.rel}: ${img.getAttribute('src')}`).toBe('A');
        expect(card.getAttribute('href')).toMatch(WIKI);
      }
    }
  });
});

describe('quest checklists', () => {
  const quests = pages.filter((p) => basename(p.path, '.md') === 'quests');

  it.each(quests.map((q) => [q.rel, q] as const))('%s has a locked checklist for every map with a guide', async (_rel, page) => {
    const root = dom(await md(page.body, { lang: page.lang }));
    const sections = [...root.querySelectorAll('h2')].map((h) => h.textContent ?? '');
    const guides = maps.filter((m) => m.lang === page.lang && m.data.status === 'guide').map((m) => String(m.data.title));
    for (const title of guides) expect(sections.some((s) => s.startsWith(title)), title).toBe(true);
    const lists = [...root.querySelectorAll('[data-checklist]')];
    expect(lists.length).toBeGreaterThanOrEqual(guides.length);
    for (const list of lists) {
      expect(list.closest('[data-spoiler]'), `${list.id} is behind a spoiler`).not.toBeNull();
      expect(list.querySelectorAll('input[type="checkbox"][data-check]').length, list.id).toBeGreaterThanOrEqual(5);
    }
  });

  it('Spanish and English checklists share ids and step counts, so progress carries over', async () => {
    const shape = async (f: (typeof files)[number]) =>
      [...dom(await md(f.body, { lang: f.lang })).querySelectorAll('[data-checklist]')].map((c) => [
        c.getAttribute('data-checklist'),
        [...c.querySelectorAll('[data-check]')].map((b) => b.getAttribute('data-check')),
      ]);
    for (const esFile of files.filter((f) => f.lang === 'es')) {
      const enFile = files.find((f) => f.lang === 'en' && f.collection === esFile.collection && f.inner === esFile.inner)!;
      expect(await shape(enFile), esFile.rel).toEqual(await shape(esFile));
    }
  });
});

describe('story page', () => {
  describe.each(pages.filter((p) => basename(p.path, '.md') === 'story').map((p) => [p.rel, p] as const))('%s', (_rel, page) => {
    it('is a narrated, spoiler-safe walk through every game', async () => {
      const root = dom(await md(page.body, { lang: page.lang }));
      const sections = [...root.querySelectorAll('h2')].map((h) => h.textContent ?? '');
      expect(sections.length, 'enough chapters').toBeGreaterThanOrEqual(8);
      for (const game of ['World at War', 'Black Ops II', 'Black Ops III', 'Black Ops 4']) {
        expect(sections.some((t) => t.includes(game)), `a chapter for ${game}`).toBe(true);
      }
      expect(page.data.intro, 'narrator intro').toBeTruthy();
      expect(page.data.hero, 'hero image').toBeTruthy();
      expect(root.querySelectorAll('.narration').length, 'narration-only lines').toBeGreaterThan(2);
      // Every twist stays behind the eye: plenty of locked blocks, and Richtofen has his own files.
      expect(root.querySelectorAll('[data-spoiler]').length, 'locked spoilers').toBeGreaterThanOrEqual(10);
      expect(root.querySelectorAll('.dossier.spoiler').length, 'locked dossiers').toBeGreaterThanOrEqual(2);
    });
  });
});

describe('images', () => {
  it('every manifest entry was downloaded and credited', () => {
    for (const { out } of manifest as { out: string }[]) {
      expect(existsSync(join(PUBLIC, 'images', out)), out).toBe(true);
      expect(CREDITS[`/images/${out}`], out).toBeDefined();
    }
  });

  it('every credit points to a wiki file page', () => {
    for (const [path, c] of Object.entries(CREDITS)) {
      expect(c.page, path).toMatch(/^https:\/\/callofduty\.fandom\.com\/wiki\/File:/);
      expect(existsSync(join(PUBLIC, path)), path).toBe(true);
    }
  });
});

describe('Spanish and English stay in sync', () => {
  const es = files.filter((f) => f.lang === 'es');
  const en = files.filter((f) => f.lang === 'en');
  const key = (f: (typeof files)[number]) => `${f.collection}/${f.inner}`;

  it('every file exists in both languages', () => {
    expect(en.map(key).sort()).toEqual(es.map(key).sort());
  });

  // Facts that must not drift between translations.
  const SHARED = ['era', 'order', 'status', 'released', 'thumb', 'hero', 'accent', 'ambient', 'difficulty', 'code', 'year'];

  describe.each(es.map((f) => [key(f), f] as const))('%s', (_k, esFile) => {
    const enFile = en.find((f) => key(f) === key(esFile))!;

    it('shares the same data and images', () => {
      expect(enFile, 'English twin').toBeDefined();
      for (const field of SHARED) expect(enFile.data[field], field).toEqual(esFile.data[field]);
      expect((enFile.data.facts as unknown[] | undefined)?.length).toEqual((esFile.data.facts as unknown[] | undefined)?.length);
      expect(imagesIn(enFile).sort()).toEqual(imagesIn(esFile).sort());
    });

    it('has the same spoilers and dossiers (same ids, so progress carries over)', async () => {
      const ids = async (f: typeof esFile) =>
        [...dom(await md(f.body, { lang: f.lang })).querySelectorAll('[data-spoiler], .dossier')].map((b) => b.id);
      expect(await ids(enFile)).toEqual(await ids(esFile));
    });
  });
});
