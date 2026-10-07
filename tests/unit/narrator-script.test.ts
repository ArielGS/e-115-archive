// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildScript, chunk, speakable, toUtterances } from '../../src/scripts/narrator-script';
import { pickVoice, rankVoices, speaksLang, voiceQuality } from '../../src/scripts/narrator';
import { md, dom } from './helpers';

const GUIDE = `
## Dónde estás

Morg City es una ciudad maldita.

:::narration
Esto solo se escucha.
:::

::figure{src="/images/basics/juggernog.webp" caption="Pie de foto"}

- Primer punto
- Segundo punto

| A | B |
| - | - |
| celda | celda |

:::spoiler[El final]{level="ee"}
Richtofen se lleva la llave.
:::

:::dossier[Margwa]{codename="Expediente 01" teaser="Grande"}
Tres cabezas.
:::

:::dossier[Zombis]{open}
Lentos.
:::
`;

async function guide() {
  return dom(await md(GUIDE));
}

describe('buildScript', () => {
  it('reads headings, text and list items in order, plus narration-only lines', async () => {
    const texts = buildScript(await guide()).map((s) => s.text);
    expect(texts.slice(0, 5)).toEqual(['Dónde estás.', 'Morg City es una ciudad maldita.', 'Esto solo se escucha.', 'Primer punto', 'Segundo punto']);
  });

  it('skips figures, tables and confirmation dialogs', async () => {
    const all = buildScript(await guide()).map((s) => s.text).join(' | ');
    expect(all).not.toContain('Pie de foto');
    expect(all).not.toContain('celda');
    expect(all).not.toContain('¿Lo abres?');
    expect(all).not.toContain('Revelar');
  });

  it('announces locked spoilers by title without reading them', async () => {
    const segs = buildScript(await guide());
    const locked = segs.filter((s) => s.kind === 'locked');
    expect(locked.map((s) => s.text)).toEqual([
      expect.stringContaining('«El final»'),
      expect.stringContaining('«Expediente 01»'),
    ]);
    const all = segs.map((s) => s.text).join(' ');
    expect(all).not.toContain('Richtofen se lleva la llave');
    expect(all).not.toContain('Tres cabezas');
    expect(all).not.toContain('Margwa');
  });

  it('reads revealed spoilers and open dossiers normally', async () => {
    const root = await guide();
    root.querySelectorAll('[data-spoiler]').forEach((el) => el.classList.add('is-open'));
    const all = buildScript(root).map((s) => s.text).join(' ');
    expect(all).toContain('Richtofen se lleva la llave');
    expect(all).toContain('Margwa.');
    expect(all).toContain('Lentos.');
  });

  it('marks narration segments and prepends the intro', async () => {
    const segs = buildScript(await guide(), 'Transmisión entrante.');
    expect(segs[0]).toMatchObject({ text: 'Transmisión entrante.', kind: 'narration' });
    expect(segs.find((s) => s.text === 'Esto solo se escucha.')?.kind).toBe('narration');
  });
});

describe('speech helpers', () => {
  it('respells names Spanish voices mispronounce', () => {
    expect(speakable('Richtofen y el Elemento 115')).toBe('Ríjtofen y el Elemento ciento quince');
    expect(speakable('Los Keepers y un Keeper')).toBe('Los Kípers y un Kíper');
    expect(speakable('Easter eggs ★ de Der Eisendrache')).toBe('íster egs de Der Áisendraje');
  });

  it('chunks long text on sentence boundaries under the limit', () => {
    const text = 'Primera frase corta. ' + 'Palabra '.repeat(60).trim() + '. Última.';
    const parts = chunk(text, 120);
    expect(parts.every((p) => p.length <= 120)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
    expect(chunk('Hola.')).toEqual(['Hola.']);
    // Spanish opening marks must not swallow the text before them.
    expect(chunk('Hay un expediente: «¿Por qué hay dos?». Lo salto.', 30).join(' ')).toBe('Hay un expediente: «¿Por qué hay dos?». Lo salto.');
  });

  it('flattens segments into utterances that remember their segment', async () => {
    const segs = buildScript(await guide());
    const utts = toUtterances(segs, 30);
    expect(utts.length).toBeGreaterThanOrEqual(segs.length);
    expect(utts.every((u) => u.index >= 0 && u.index < segs.length)).toBe(true);
  });

  it('reads English pages with English wording and no Spanish respelling', async () => {
    const root = dom(await md(':::spoiler[The end]{level="ee"}\nx\n:::\n\nRichtofen and Element 115.', { lang: 'en' }));
    const segs = buildScript(root, undefined, 'en');
    expect(segs[0].text).toContain('There is a locked file: "The end"');
    expect(toUtterances(segs, 220, 'en').map((u) => u.text)).toContain('Richtofen and Element 115.');
    expect(speakable('Richtofen', 'en')).toBe('Richtofen');
  });

  it('ranks voices in the page language first', () => {
    const v = (name: string, lang: string) => ({ name, lang, localService: false, voiceURI: name, default: false }) as SpeechSynthesisVoice;
    expect(rankVoices([v('Paulina', 'es-MX'), v('Daniel', 'en-GB'), v('Zarvox', 'en-US')], 'en').map((x) => x.name)).toEqual(['Daniel', 'Zarvox', 'Paulina']);
  });

  it('ranks Spanish voices first', () => {
    const v = (name: string, lang: string, localService = false) => ({ name, lang, localService, voiceURI: name, default: false }) as SpeechSynthesisVoice;
    const ranked = rankVoices([v('Alex', 'en-US'), v('Eddy (Spanish (Spain))', 'es-ES'), v('Paulina', 'es-MX'), v('Google español', 'es-ES'), v('Monica', 'es-ES', true)]);
    expect(ranked.map((x) => x.name)).toEqual(['Google español', 'Monica', 'Paulina', 'Eddy (Spanish (Spain))', 'Alex']);
  });

  describe('picking the starting voice', () => {
    const v = (name: string, lang: string) => ({ name, lang, localService: false, voiceURI: name, default: false }) as SpeechSynthesisVoice;
    const french = v('Microsoft Denise Online (Natural) - French (France)', 'fr-FR');
    const spanish = v('Microsoft Elvira Online (Natural) - Spanish (Spain)', 'es-ES');
    const mexican = v('Microsoft Raul - Spanish (Mexico)', 'es-MX');
    const english = v('Microsoft Aria Online (Natural) - English (United States)', 'en-US');
    const all = [french, mexican, english, spanish];

    it('matches the page language by prefix only', () => {
      expect(speaksLang(v('x', 'es-419'), 'es')).toBe(true);
      expect(speaksLang(v('x', 'es_ES'), 'es')).toBe(true);
      expect(speaksLang(v('x', 'es'), 'es')).toBe(true);
      expect(speaksLang(v('x', 'fr-FR'), 'es')).toBe(false);
      expect(speaksLang(v('x', 'est-EE'), 'es')).toBe(false);
    });

    it('starts with the best voice in the page language, never a foreign one', () => {
      expect(pickVoice(rankVoices(all, 'es'), 'es')).toBe(spanish);
      expect(pickVoice(rankVoices(all, 'en'), 'en')).toBe(english);
    });

    it('keeps a saved choice only if it speaks the page language', () => {
      const ranked = rankVoices(all, 'es');
      expect(pickVoice(ranked, 'es', [mexican.voiceURI])).toBe(mexican);
      expect(pickVoice(ranked, 'es', [french.voiceURI])).toBe(spanish);
      expect(pickVoice(ranked, 'es', [english.voiceURI, mexican.voiceURI])).toBe(mexican);
      expect(pickVoice(ranked, 'es', ['gone', null])).toBe(spanish);
    });

    it('falls back to any voice when none speaks the page language', () => {
      expect(pickVoice([french], 'es')).toBe(french);
      expect(pickVoice([], 'es')).toBeUndefined();
    });
  });

  it('tells natural voices from robotic ones', () => {
    const q = (name: string, voiceURI = name) => voiceQuality({ name, voiceURI });
    expect(q('Microsoft Elvira Online (Natural) - Spanish (Spain)')).toBe('natural');
    expect(q('Mónica', 'com.apple.voice.enhanced.es-ES.Monica')).toBe('natural');
    expect(q('Mónica', 'com.apple.voice.premium.es-ES.Monica')).toBe('natural');
    expect(q('Google español')).toBe('good');
    expect(q('Microsoft Helena - Spanish (Spain)')).toBe('basic');
    expect(q('Mónica', 'com.apple.voice.compact.es-ES.Monica')).toBe('basic');
    expect(q('Eddy (Spanish (Spain))', 'com.apple.eloquence.es-ES.Eddy')).toBe('novelty');
    expect(q('Reed', 'com.apple.voice.x')).toBe('novelty');
  });

  it('puts a natural voice from any region before robotic ones from Spain', () => {
    const v = (name: string, lang: string, localService = false) => ({ name, lang, localService, voiceURI: name, default: false }) as SpeechSynthesisVoice;
    const ranked = rankVoices([
      v('Microsoft Helena - Spanish (Spain)', 'es-ES', true),
      v('Google español', 'es-ES'),
      v('Microsoft Candela Online (Natural) - Spanish (Mexico)', 'es-MX'),
      v('Microsoft Elvira Online (Natural) - Spanish (Spain)', 'es-ES'),
      v('Microsoft Aria Online (Natural) - English (United States)', 'en-US'),
    ]);
    expect(ranked.map((x) => x.name)).toEqual([
      'Microsoft Elvira Online (Natural) - Spanish (Spain)',
      'Microsoft Candela Online (Natural) - Spanish (Mexico)',
      'Google español',
      'Microsoft Helena - Spanish (Spain)',
      'Microsoft Aria Online (Natural) - English (United States)',
    ]);
  });
});
