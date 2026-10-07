// Turns the Markdown directives used in src/content into the site's custom
// markup. Authors write plain Markdown plus a few directives:
//
//   :::spoiler[Title]{level="boss"}      locked block, revealed with the eye
//   :::dossier[Name]{img=… threat=3}     enemy / boss card, locked by default
//   :::narration                         text only the voice narrator reads
//   :::callout{type="tip"}               highlighted note (tip|warn|info|lore)
//   :::steps                             wraps an ordered list of steps
//   :::grid / :::card[Title]{img=…}      card grid
//   :::quote{by="Shadowman"}             in-world quote
//   ::figure{src=… caption=…}            credited image
//
// Every directive maps to plain HTML + CSS classes, so contributors never
// touch components. Unknown directives fail the build with a clear message.
import { visit, SKIP } from 'unist-util-visit';
import credits from '../data/image-credits.json' with { type: 'json' };

type Attrs = Record<string, string | null | undefined>;
type Node = {
  type: string;
  name?: string;
  attributes?: Attrs | null;
  children?: Node[];
  value?: string;
  data?: Record<string, unknown>;
  position?: { start: { line: number } };
};

export type Lang = 'es' | 'en';

export interface Options {
  /** Site base path ("/" or "/repo/"), prefixed to absolute image paths. */
  base?: string;
  /** Language of the generated labels. Defaults to the file path (/es/ or /en/). */
  lang?: Lang;
}

export interface Credit {
  file: string;
  page: string;
  source: string;
}

const CREDITS = credits as Record<string, Credit>;

const LABELS = {
  es: {
    levels: { lore: 'Lore', boss: 'Jefe', enemy: 'Enemigo', quest: 'Misión', ee: 'Easter egg', weapon: 'Arma' },
    callouts: { tip: 'Consejo', warn: 'Ojo', info: 'Dato', lore: 'Lore' },
    kinds: { enemy: 'Enemigo', boss: 'Jefe', ally: 'Aliado', weapon: 'Arma', character: 'Personaje' },
    reveal: 'Revelar',
    confirmLabel: 'Confirmar spoiler: ',
    confirm: (title: string, level: string) => ['Esto contiene spoilers de ', title, ` (${level.toLowerCase()}). ¿Lo abres?`],
    accept: 'Sí, revelar',
    cancel: 'Aún no',
    file: 'Expediente',
    threat: (n: number) => `Amenaza ${n} de 5`,
    image: 'Imagen: ',
  },
  en: {
    levels: { lore: 'Lore', boss: 'Boss', enemy: 'Enemy', quest: 'Quest', ee: 'Easter egg', weapon: 'Weapon' },
    callouts: { tip: 'Tip', warn: 'Careful', info: 'Note', lore: 'Lore' },
    kinds: { enemy: 'Enemy', boss: 'Boss', ally: 'Ally', weapon: 'Weapon', character: 'Character' },
    reveal: 'Reveal',
    confirmLabel: 'Confirm spoiler: ',
    confirm: (title: string, level: string) => ['This contains spoilers about ', title, ` (${level.toLowerCase()}). Open it?`],
    accept: 'Yes, reveal',
    cancel: 'Not yet',
    file: 'File',
    threat: (n: number) => `Threat ${n} of 5`,
    image: 'Image: ',
  },
} as const;
type Labels = (typeof LABELS)[Lang];

/** Spanish labels, exported for documentation and tests. */
export const SPOILER_LEVELS: Record<string, string> = { ...LABELS.es.levels };

export function langFromPath(path?: string): Lang {
  return path && /[\\/]en[\\/]/.test(path) ? 'en' : 'es';
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function withBase(base: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return base.replace(/\/+$/, '') + path;
}

export function creditFor(src: string): Credit | undefined {
  return CREDITS[src];
}

// --- tiny mdast builders (data.hName/hProperties become HTML) -------------

function el(tag: string, props: Record<string, unknown>, children: Node[] = []): Node {
  return { type: 'zEl', data: { hName: tag, hProperties: props }, children };
}
const text = (value: string): Node => ({ type: 'text', value });

/** Pulls the `[label]` paragraph out of a directive and returns it as text. */
function takeLabel(node: Node): string {
  const first = node.children?.[0];
  if (first?.data?.directiveLabel) {
    node.children!.shift();
    return toPlain(first);
  }
  return '';
}

function toPlain(node: Node): string {
  if (node.value) return node.value;
  return (node.children ?? []).map(toPlain).join('');
}

function where(node: Node, file?: { path?: string }): string {
  return `${file?.path ?? 'markdown'}:${node.position?.start.line ?? '?'}`;
}

function need(attrs: Attrs, key: string, node: Node, file?: { path?: string }): string {
  const value = attrs[key];
  if (!value) throw new Error(`[archivo-115] ${node.name} needs ${key}="…" (${where(node, file)})`);
  return value;
}

function image(src: string, alt: string, base: string, extra: Record<string, unknown> = {}): Node {
  return el('img', { src: withBase(base, src), alt, loading: 'lazy', decoding: 'async', ...extra });
}

function creditLine(src: string, L: Labels): Node[] {
  const credit = creditFor(src);
  if (!credit) return [];
  return [
    el('span', { className: ['credit'] }, [
      text(L.image),
      el('a', { href: credit.page, rel: 'noopener', target: '_blank' }, [text(credit.source)]),
    ]),
  ];
}

/** Eye button + inline confirmation shared by spoilers and dossiers. */
function lockParts(id: string, title: string, levelLabel: string, L: Labels): Node[] {
  const [before, strong, after] = L.confirm(title, levelLabel);
  return [
    el(
      'button',
      {
        type: 'button',
        className: ['eye-btn'],
        dataSpoilerToggle: '',
        ariaExpanded: 'false',
        ariaControls: `${id}-body`,
      },
      [
        el('span', { className: ['eye'], ariaHidden: 'true' }, [el('span', { className: ['eye-pupil'] })]),
        el('span', { className: ['eye-btn-text'] }, [text(L.reveal)]),
      ],
    ),
    el('div', { className: ['spoiler-confirm'], hidden: true, role: 'alertdialog', ariaLabel: L.confirmLabel + title }, [
      el('p', {}, [text(before), el('strong', {}, [text(strong)]), text(after)]),
      el('div', { className: ['spoiler-confirm-actions'] }, [
        el('button', { type: 'button', className: ['btn', 'btn--danger'], dataSpoilerAccept: '' }, [text(L.accept)]),
        el('button', { type: 'button', className: ['btn'], dataSpoilerCancel: '' }, [text(L.cancel)]),
      ]),
    ]),
  ];
}

function threatMeter(level: number, L: Labels): Node {
  const pips: Node[] = [];
  for (let i = 1; i <= 5; i++) pips.push(el('i', i <= level ? { className: ['on'] } : {}));
  return el('span', { className: ['threat'], role: 'img', ariaLabel: L.threat(level), dataThreat: String(level) }, pips);
}

// --- directive handlers ---------------------------------------------------

type Ctx = { base: string; file?: { path?: string }; ids: Set<string>; dossiers: number; L: Labels };

function uniqueId(ctx: Ctx, wanted: string, node: Node): string {
  const id = slugify(wanted);
  if (!id) throw new Error(`[archivo-115] ${node.name} needs a title or id (${where(node, ctx.file)})`);
  if (ctx.ids.has(id)) throw new Error(`[archivo-115] duplicate spoiler id "${id}" (${where(node, ctx.file)})`);
  ctx.ids.add(id);
  return id;
}

const handlers: Record<string, (node: Node, attrs: Attrs, ctx: Ctx) => Node> = {
  spoiler(node, attrs, ctx) {
    const title = takeLabel(node) || attrs.title || 'Spoiler';
    const levels = ctx.L.levels as Record<string, string>;
    const level = attrs.level && levels[attrs.level] ? attrs.level : 'lore';
    const id = uniqueId(ctx, attrs.id || title, node);
    return el('section', { className: ['spoiler', `spoiler--${level}`], id, dataSpoiler: '', dataTitle: title, dataLevel: level }, [
      el('div', { className: ['spoiler-head'] }, [
        el('span', { className: ['spoiler-level'] }, [text(levels[level])]),
        el('p', { className: ['spoiler-title'] }, [text(title)]),
        ...lockParts(id, title, levels[level], ctx.L),
      ]),
      el('div', { className: ['spoiler-body'], id: `${id}-body` }, node.children ?? []),
    ]);
  },

  dossier(node, attrs, ctx) {
    const name = takeLabel(node) || need(attrs, 'name', node, ctx.file);
    const kinds = ctx.L.kinds as Record<string, string>;
    const kind = attrs.kind && kinds[attrs.kind] ? attrs.kind : 'enemy';
    const threat = Math.min(5, Math.max(1, Number(attrs.threat ?? 3) || 3));
    const locked = attrs.open === undefined;
    const id = uniqueId(ctx, attrs.id || name, node);
    ctx.dossiers += 1;
    const codename = attrs.codename || `${ctx.L.file} ${String(ctx.dossiers).padStart(2, '0')}`;
    const img = attrs.img;

    const body: Node[] = [];
    if (img) {
      body.push(
        el('figure', { className: ['dossier-photo'] }, [
          image(img, attrs.alt || name, ctx.base),
          el('figcaption', {}, creditLine(img, ctx.L)),
        ]),
      );
    }
    body.push(el('div', { className: ['dossier-text'] }, [
      el('p', { className: ['dossier-name'], role: 'heading', ariaLevel: '3' }, [text(name)]),
      ...(node.children ?? []),
    ]));

    const head: Node[] = [
      el('span', { className: ['dossier-kind'] }, [text(kinds[kind])]),
      el('span', { className: ['dossier-code'] }, [text(locked ? codename : name)]),
      threatMeter(threat, ctx.L),
    ];
    if (attrs.teaser) head.push(el('p', { className: ['dossier-teaser'] }, [text(attrs.teaser)]));
    if (locked) head.push(...lockParts(id, codename, kinds[kind], ctx.L));

    return el(
      'article',
      {
        className: ['dossier', `dossier--${kind}`, ...(locked ? ['spoiler'] : ['is-open'])],
        id,
        ...(locked ? { dataSpoiler: '' } : {}),
        dataTitle: locked ? codename : name,
        dataLevel: kind,
      },
      [el('div', { className: ['dossier-head'] }, head), el('div', { className: ['spoiler-body', 'dossier-body'], id: `${id}-body` }, body)],
    );
  },

  narration(node) {
    return el('div', { className: ['narration'], hidden: true, dataNarration: '' }, node.children ?? []);
  },

  callout(node, attrs, ctx) {
    const labels = ctx.L.callouts as Record<string, string>;
    const type = attrs.type && labels[attrs.type] ? attrs.type : 'info';
    const label = takeLabel(node) || labels[type];
    return el('aside', { className: ['callout', `callout--${type}`] }, [
      el('p', { className: ['callout-label'] }, [text(label)]),
      ...(node.children ?? []),
    ]);
  },

  steps(node) {
    return el('div', { className: ['steps'] }, node.children ?? []);
  },

  grid(node) {
    return el('div', { className: ['card-grid'] }, node.children ?? []);
  },

  card(node, attrs, ctx) {
    const title = takeLabel(node) || need(attrs, 'title', node, ctx.file);
    const children: Node[] = [];
    if (attrs.img) children.push(el('div', { className: ['card-media'] }, [image(attrs.img, attrs.alt || title, ctx.base)]));
    children.push(el('p', { className: ['card-title'] }, [text(title)]));
    children.push(el('div', { className: ['card-body'] }, node.children ?? []));
    return el('div', { className: ['card', ...(attrs.tag ? ['card--tagged'] : [])], ...(attrs.tag ? { dataTag: attrs.tag } : {}) }, children);
  },

  quote(node, attrs) {
    const by = attrs.by;
    return el('blockquote', { className: ['lore-quote'] }, [
      ...(node.children ?? []),
      ...(by ? [el('p', { className: ['lore-quote-by'] }, [text(`— ${by}`)])] : []),
    ]);
  },

  figure(node, attrs, ctx) {
    const src = need(attrs, 'src', node, ctx.file);
    const caption = attrs.caption ?? '';
    const wide = attrs.wide !== undefined;
    return el('figure', { className: ['figure', ...(wide ? ['figure--wide'] : [])], dataReveal: '' }, [
      image(src, attrs.alt || caption, ctx.base),
      el('figcaption', {}, [...(caption ? [el('span', {}, [text(caption)])] : []), ...creditLine(src, ctx.L)]),
    ]);
  },
};

export const DIRECTIVES = Object.keys(handlers);

export default function remarkZombies(options: Options = {}) {
  const base = options.base ?? '/';
  return (tree: Node, file?: { path?: string }) => {
    const lang = options.lang ?? langFromPath(file?.path ?? (file as { history?: string[] } | undefined)?.history?.[0]);
    const ctx: Ctx = { base, file, ids: new Set(), dossiers: 0, L: LABELS[lang] };

    // Process outer directives first; handlers keep their children, which
    // are visited afterwards because we return the new node in place.
    visit(tree as never, (raw: unknown, index?: number, parent?: unknown) => {
      const node = raw as Node;
      const par = parent as Node | undefined;
      if (node.type === 'textDirective') {
        // "texto:palabra" is just text for us — restore what the author typed.
        if (par && index !== undefined) {
          par.children!.splice(index, 1, text(`:${node.name}${toPlain(node)}`));
          return [SKIP, index];
        }
        return;
      }
      if (node.type !== 'containerDirective' && node.type !== 'leafDirective') return;
      const handler = handlers[node.name ?? ''];
      if (!handler) {
        throw new Error(`[archivo-115] unknown directive "${node.name}" (${where(node, file)}). Known: ${DIRECTIVES.join(', ')}`);
      }
      const replacement = handler(node, node.attributes ?? {}, ctx);
      Object.assign(node, replacement, { name: undefined, attributes: undefined });
    });
  };
}
