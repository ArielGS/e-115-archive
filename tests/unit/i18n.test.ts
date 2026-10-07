import { describe, expect, it } from 'vitest';
import { detectScript, localePath, pagePath, preferredLang, splitLangPath, switchPath, t, tList, ui, LANGS } from '../../src/i18n/ui';

describe('localized paths', () => {
  it('Spanish lives at the root, English under /en/', () => {
    expect(localePath('es', '/bo3/the-giant/')).toBe('/bo3/the-giant/');
    expect(localePath('en', '/bo3/the-giant/')).toBe('/en/bo3/the-giant/');
    expect(localePath('en', '/')).toBe('/en/');
    expect(localePath('en', '/#bo2')).toBe('/en/#bo2');
  });

  it('pages with translated slugs', () => {
    expect(pagePath('es', 'credits')).toBe('/creditos/');
    expect(pagePath('en', 'credits')).toBe('/en/credits/');
    expect(pagePath('es', 'contribute')).toBe('/contribuir/');
    expect(pagePath('en', 'contribute')).toBe('/en/contribute/');
  });

  it('splits the language prefix', () => {
    expect(splitLangPath('/en/bo3/x/')).toEqual({ lang: 'en', path: '/bo3/x/' });
    expect(splitLangPath('/en')).toEqual({ lang: 'en', path: '/' });
    expect(splitLangPath('/bo3/x/')).toEqual({ lang: 'es', path: '/bo3/x/' });
    // a map whose slug merely starts with "en" is not English
    expect(splitLangPath('/enigma/')).toEqual({ lang: 'es', path: '/enigma/' });
  });

  it('switches to the equivalent page in the other language', () => {
    expect(switchPath('/', 'en')).toBe('/en/');
    expect(switchPath('/en/', 'es')).toBe('/');
    expect(switchPath('/bo3/der-eisendrache/', 'en')).toBe('/en/bo3/der-eisendrache/');
    expect(switchPath('/en/bo3/der-eisendrache/', 'es')).toBe('/bo3/der-eisendrache/');
    expect(switchPath('/creditos/', 'en')).toBe('/en/credits/');
    expect(switchPath('/en/contribute/', 'es')).toBe('/contribuir/');
    expect(switchPath('/contribuir/', 'es')).toBe('/contribuir/');
  });
});

describe('preferredLang', () => {
  it('a saved choice always wins', () => {
    expect(preferredLang('en', ['es-ES'])).toBe('en');
    expect(preferredLang('es', ['en-US'])).toBe('es');
  });

  it('otherwise uses the first supported language in the browser list', () => {
    expect(preferredLang(null, ['es-MX', 'en'])).toBe('es');
    expect(preferredLang(null, ['ES'])).toBe('es');
    expect(preferredLang(null, ['en-GB'])).toBe('en');
    expect(preferredLang(null, ['en-US', 'en-CR', 'es-CR'])).toBe('en');
    expect(preferredLang(null, ['pt-BR', 'es-AR', 'en'])).toBe('es');
  });

  it('falls back to English for browsers with no supported language', () => {
    expect(preferredLang(null, ['pt-BR'])).toBe('en');
    expect(preferredLang('fr', ['de-DE'])).toBe('en');
  });

  it('falls back to Spanish with no information', () => {
    expect(preferredLang(null, [])).toBe('es');
  });
});

describe('UI dictionary', () => {
  it('has every key in every language', () => {
    const keys = Object.keys(ui.es).sort();
    for (const lang of LANGS) expect(Object.keys(ui[lang]).sort(), lang).toEqual(keys);
  });

  it('lists keep the same length across languages', () => {
    for (const [k, v] of Object.entries(ui.es)) {
      if (Array.isArray(v)) expect((ui.en as Record<string, unknown>)[k], k).toHaveLength(v.length);
    }
  });

  it('fills placeholders', () => {
    expect(t('en', 'era.maps', { code: 'BO3' })).toBe('BO3 maps');
    expect(t('es', 'map.back', { code: 'BO2' })).toBe('← Mapas de BO2');
    expect(tList('en', 'home.console', { guides: 3 })).toContain('Full guides: 3');
  });
});

describe('detectScript (the inline redirect that runs in <head>)', () => {
  const alternates = { es: '/bo3/the-giant/', en: '/en/bo3/the-giant/' };

  /** Runs the generated script against a fake browser and returns where it redirected. */
  function run(opts: { lang: 'es' | 'en'; saved?: string | null; langs?: string[]; detect?: boolean; hash?: string; throwOnStorage?: boolean }) {
    let redirected: string | null = null;
    const localStorage = {
      getItem: () => {
        if (opts.throwOnStorage) throw new Error('blocked');
        return opts.saved ?? null;
      },
    };
    const navigator = { languages: opts.langs ?? [], language: opts.langs?.[0] ?? '' };
    const location = { search: '', hash: opts.hash ?? '', replace: (u: string) => (redirected = u) };
    const code = detectScript({ lang: opts.lang, alternates, detect: opts.detect ?? true });
    new Function('localStorage', 'navigator', 'location', code)(localStorage, navigator, location);
    return redirected;
  }

  it('sends a Spanish browser from the English page to the Spanish one', () => {
    expect(run({ lang: 'en', langs: ['es-ES'] })).toBe('/bo3/the-giant/');
  });

  it('sends an English (or any other) browser to English, keeping the hash', () => {
    expect(run({ lang: 'es', langs: ['en-US'], hash: '#bo3' })).toBe('/en/bo3/the-giant/#bo3');
    expect(run({ lang: 'es', langs: ['ja-JP'] })).toBe('/en/bo3/the-giant/');
  });

  it('uses the first supported language in the list', () => {
    expect(run({ lang: 'es', langs: ['en-US', 'en-CR', 'es-CR'] })).toBe('/en/bo3/the-giant/');
    expect(run({ lang: 'en', langs: ['pt-BR', 'es-AR', 'en'] })).toBe('/bo3/the-giant/');
  });

  it('does nothing when the page is already right', () => {
    expect(run({ lang: 'es', langs: ['es-MX'] })).toBeNull();
    expect(run({ lang: 'en', langs: ['en-GB'] })).toBeNull();
  });

  it('a saved choice beats the browser', () => {
    expect(run({ lang: 'en', saved: 'en', langs: ['es-ES'] })).toBeNull();
    expect(run({ lang: 'es', saved: 'es', langs: ['en-US'] })).toBeNull();
    expect(run({ lang: 'es', saved: 'en', langs: ['es-ES'] })).toBe('/en/bo3/the-giant/');
  });

  it('can be turned off and never throws', () => {
    expect(run({ lang: 'es', langs: ['en-US'], detect: false })).toBeNull();
    expect(run({ lang: 'es', langs: ['en-US'], throwOnStorage: true })).toBeNull();
  });

  it('agrees with preferredLang', () => {
    const cases: [string | null, string[]][] = [[null, ['es-ES']], [null, ['en-US', 'es']], [null, ['fr']], ['es', ['en']], [null, []]];
    for (const [saved, langs] of cases) {
      const want = preferredLang(saved, langs);
      const other = want === 'es' ? 'en' : 'es';
      // Started on the other language, it must redirect to `want`.
      expect(run({ lang: other, saved, langs }), JSON.stringify([saved, langs])).toBe(alternates[want]);
    }
  });
});
