// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { md, dom } from './helpers';
import { slugify, withBase, creditFor, DIRECTIVES, langFromPath } from '../../src/lib/remark-zombies';

describe('helpers', () => {
  it('slugify strips accents and symbols', () => {
    expect(slugify('¿Qué pasa al terminar?')).toBe('que-pasa-al-terminar');
    expect(slugify('  Li\'l Arnie  ')).toBe('li-l-arnie');
  });

  it('withBase prefixes only root-relative paths', () => {
    expect(withBase('/', '/images/a.webp')).toBe('/images/a.webp');
    expect(withBase('/archivo-115/', '/images/a.webp')).toBe('/archivo-115/images/a.webp');
    expect(withBase('/repo', 'https://x.y/z.png')).toBe('https://x.y/z.png');
    expect(withBase('/repo', '//cdn/z.png')).toBe('//cdn/z.png');
  });

  it('knows the credit of downloaded images', () => {
    expect(creditFor('/images/maps/bo3/shadows-of-evil/margwa.webp')?.page).toMatch(/^https:\/\/callofduty\.fandom\.com\/wiki\/File:/);
    expect(creditFor('/images/nope.webp')).toBeUndefined();
  });
});

describe(':::spoiler', () => {
  it('renders a locked block with eye button, confirmation and hidden body', async () => {
    const root = dom(await md(':::spoiler[El final]{level="ee"}\nTodo muere.\n:::'));
    const block = root.querySelector('section.spoiler')!;
    expect(block.id).toBe('el-final');
    expect(block.hasAttribute('data-spoiler')).toBe(true);
    expect(block.getAttribute('data-title')).toBe('El final');
    expect(block.classList.contains('spoiler--ee')).toBe(true);
    expect(block.querySelector('.spoiler-level')!.textContent).toBe('Easter egg');
    expect(block.querySelector('[data-spoiler-toggle]')!.getAttribute('aria-controls')).toBe('el-final-body');
    expect(block.querySelector('.spoiler-confirm')!.hasAttribute('hidden')).toBe(true);
    expect(block.querySelector('#el-final-body')!.textContent).toContain('Todo muere.');
    // the label paragraph must not leak into the body
    expect(block.querySelector('.spoiler-body')!.textContent).not.toContain('El final');
  });

  it('falls back to the lore level for unknown levels and honours explicit ids', async () => {
    const root = dom(await md(':::spoiler[Algo]{level="nope" id="mi-id"}\nx\n:::'));
    const block = root.querySelector('section.spoiler')!;
    expect(block.id).toBe('mi-id');
    expect(block.getAttribute('data-level')).toBe('lore');
  });

  it('rejects duplicate ids on the same page', async () => {
    await expect(md(':::spoiler[A]\nx\n:::\n\n:::spoiler[A]\ny\n:::')).rejects.toThrow(/duplicate spoiler id "a"/);
  });

  it('supports nesting with longer fences', async () => {
    const root = dom(await md('::::spoiler[Fuera]\n:::spoiler[Dentro]\nsecreto\n:::\n::::'));
    expect(root.querySelectorAll('[data-spoiler]')).toHaveLength(2);
    expect(root.querySelector('#fuera-body #dentro')).not.toBeNull();
  });
});

describe(':::dossier', () => {
  it('is locked by default and shows only the codename, threat and teaser', async () => {
    const root = dom(
      await md(':::dossier[Margwa]{kind="boss" threat="4" codename="Expediente 01" teaser="Grande." img="/images/maps/bo3/shadows-of-evil/margwa.webp"}\nTres cabezas.\n:::'),
    );
    const card = root.querySelector('article.dossier')!;
    expect(card.classList.contains('spoiler')).toBe(true);
    expect(card.getAttribute('data-title')).toBe('Expediente 01');
    const head = card.querySelector('.dossier-head')!;
    expect(head.textContent).toContain('Expediente 01');
    expect(head.textContent).toContain('Grande.');
    expect(head.textContent).not.toContain('Margwa');
    expect(card.querySelectorAll('.threat i.on')).toHaveLength(4);
    expect(card.querySelector('.dossier-body .dossier-name')!.textContent).toBe('Margwa');
    expect(card.querySelector('.dossier-body img')!.getAttribute('src')).toBe('/images/maps/bo3/shadows-of-evil/margwa.webp');
    expect(card.querySelector('.dossier-photo .credit a')!.getAttribute('href')).toContain('fandom.com');
  });

  it('can be rendered open and clamps the threat level', async () => {
    const root = dom(await md(':::dossier[Zombis]{open threat="9"}\nLentos.\n:::'));
    const card = root.querySelector('article.dossier')!;
    expect(card.classList.contains('is-open')).toBe(true);
    expect(card.hasAttribute('data-spoiler')).toBe(false);
    expect(card.querySelector('[data-spoiler-toggle]')).toBeNull();
    expect(card.querySelectorAll('.threat i.on')).toHaveLength(5);
  });

  it('numbers codenames automatically', async () => {
    const root = dom(await md(':::dossier[A]\n1\n:::\n\n:::dossier[B]\n2\n:::'));
    const codes = [...root.querySelectorAll('.dossier-code')].map((e) => e.textContent);
    expect(codes).toEqual(['Expediente 01', 'Expediente 02']);
  });
});

describe('other directives', () => {
  it('narration is hidden and marked for the narrator', async () => {
    const root = dom(await md(':::narration\nSolo se escucha.\n:::'));
    const n = root.querySelector('.narration')!;
    expect(n.hasAttribute('hidden')).toBe(true);
    expect(n.hasAttribute('data-narration')).toBe(true);
  });

  it('callout, steps, grid/card and quote', async () => {
    const root = dom(
      await md(
        [
          ':::callout{type="warn"}\nCuidado\n:::',
          ':::steps\n1. Uno\n2. Dos\n:::',
          '::::grid\n:::card[Escudo]{img="/images/basics/juggernog.webp" tag="Nuevo"}\nTexto\n:::\n::::',
          ':::quote{by="Nikolai"}\nVodka.\n:::',
        ].join('\n\n'),
      ),
    );
    expect(root.querySelector('aside.callout--warn .callout-label')!.textContent).toBe('Ojo');
    expect(root.querySelectorAll('.steps ol li')).toHaveLength(2);
    const card = root.querySelector('.card-grid .card')!;
    expect(card.getAttribute('data-tag')).toBe('Nuevo');
    expect(card.querySelector('.card-title')!.textContent).toBe('Escudo');
    expect(root.querySelector('blockquote.lore-quote .lore-quote-by')!.textContent).toBe('— Nikolai');
  });

  it('figure prefixes the base path and adds the credit', async () => {
    const root = dom(await md('::figure{src="/images/basics/juggernog.webp" caption="Juggernog" wide}', { base: '/archivo-115/' }));
    const fig = root.querySelector('figure.figure')!;
    expect(fig.classList.contains('figure--wide')).toBe(true);
    expect(fig.querySelector('img')!.getAttribute('src')).toBe('/archivo-115/images/basics/juggernog.webp');
    expect(fig.querySelector('img')!.getAttribute('alt')).toBe('Juggernog');
    expect(fig.querySelector('figcaption')!.textContent).toContain('Call of Duty Wiki');
  });

  it('keeps accidental text directives as plain text', async () => {
    const root = dom(await md('Ronda:final del juego y hora 10:30'));
    expect(root.textContent).toBe('Ronda:final del juego y hora 10:30');
  });

  it('fails loudly on unknown directives and missing attributes', async () => {
    await expect(md(':::espoiler\nx\n:::')).rejects.toThrow(/unknown directive "espoiler"/);
    await expect(md('::figure{caption="sin src"}')).rejects.toThrow(/figure needs src/);
  });

  it('exposes the list of directives for documentation', () => {
    expect(DIRECTIVES).toEqual(expect.arrayContaining(['spoiler', 'dossier', 'narration', 'figure']));
  });
});

describe('language', () => {
  it('uses English labels for English content', async () => {
    const root = dom(
      await md(':::dossier[Margwa]{kind="boss" threat="2"}\nx\n:::\n\n:::spoiler[End]{level="ee"}\ny\n:::\n\n:::callout{type="warn"}\nz\n:::', { lang: 'en' }),
    );
    expect(root.querySelector('.dossier-kind')!.textContent).toBe('Boss');
    expect(root.querySelector('.dossier-code')!.textContent).toBe('File 01');
    expect(root.querySelector('.threat')!.getAttribute('aria-label')).toBe('Threat 2 of 5');
    expect(root.querySelector('.eye-btn-text')!.textContent).toBe('Reveal');
    expect(root.querySelector('section.spoiler .spoiler-confirm p')!.textContent).toBe('This contains spoilers about End (easter egg). Open it?');
    expect(root.querySelector('[data-spoiler-accept]')!.textContent).toBe('Yes, reveal');
    expect(root.querySelector('.callout-label')!.textContent).toBe('Careful');
  });

  it('detects the language from the file path', () => {
    expect(langFromPath('/x/src/content/maps/en/bo3/the-giant.md')).toBe('en');
    expect(langFromPath('C:\\repo\\src\\content\\maps\\en\\bo3\\a.md')).toBe('en');
    expect(langFromPath('/x/src/content/maps/es/bo3/the-giant.md')).toBe('es');
    expect(langFromPath(undefined)).toBe('es');
  });
});
