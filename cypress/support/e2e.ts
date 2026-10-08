/// <reference types="cypress" />

export interface SpeechLog {
  spoken: string[];
  cancels: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Visits a page with the Flash intro already "seen". */
      visitPage(
        path: string,
        opts?: {
          intro?: boolean;
          speech?: boolean;
          /** Voices the fake speech engine offers. Defaults to one basic es-ES voice. */
          voices?: FakeVoice[];
          reducedMotion?: boolean;
          /** Start with sound already switched on (as if chosen on an earlier visit). */
          sound?: boolean;
          /** Report a mouse (hover + fine pointer), whatever the test browser says. */
          mouse?: boolean;
          /** Saved language choice. Defaults to "es"; null = none saved (auto-detect). */
          lang?: 'es' | 'en' | null;
          /** Fake navigator.languages, e.g. ["es-MX"] (see browserLanguages). */
          browserLangs?: string[];
        },
      ): Chainable<AUTWindow>;
      /**
       * Makes the browser itself report these languages (navigator.languages
       * and Accept-Language) until the end of the test, whatever the OS
       * language is. Chromium-based browsers only (Electron, Chrome, Edge).
       */
      browserLanguages(langs: string[]): Chainable<void>;
      /** Returns what the fake speech engine has spoken so far. */
      speech(): Chainable<SpeechLog>;
    }
  }
}

/** Fake Web Speech API: records utterances and "finishes" them quickly. */
export interface FakeVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
}

const TEST_VOICES: FakeVoice[] = [{ name: 'Voz de prueba', lang: 'es-ES', voiceURI: 'test-es', localService: true, default: true }];

function installSpeech(win: Cypress.AUTWindow, voices: FakeVoice[] = TEST_VOICES) {
  const log: SpeechLog = { spoken: [], cancels: 0 };
  let timer: ReturnType<typeof setTimeout> | undefined;
  class FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  const synth = {
    speak(u: FakeUtterance) {
      log.spoken.push(u.text);
      timer = setTimeout(() => u.onend?.(), 40);
    },
    cancel() {
      log.cancels++;
      if (timer) clearTimeout(timer);
    },
    pause() {},
    resume() {},
    getVoices: () => voices,
    addEventListener() {},
  };
  Object.defineProperty(win, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(win, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  (win as unknown as { __speech: SpeechLog }).__speech = log;
}

// The CSS page wipe (@view-transition) is a cross-document view transition.
// When Chromium skips one (it happens under Cypress when the next page loads
// before the wipe is ready), it rejects a promise that page code never gets
// to see, and Cypress reports it as an app error at random. Ignore exactly
// that error; any other uncaught error still fails the test.
Cypress.on('uncaught:exception', (err) => {
  if (err.name === 'AbortError' && err.message.includes('Transition was skipped')) return false;
});

// Overriding navigator.languages from window:before:load is not reliable: on
// some setups (seen on Windows) the page ends up in a fresh window that keeps
// the OS languages, so detection tests silently ran with the real locale.
// The DevTools protocol changes what the browser reports instead.
const cdp = (command: string, params: Record<string, unknown>) =>
  Cypress.automation('remote:debugger:protocol', { command, params });
let languagesOverridden = false;

Cypress.Commands.add('browserLanguages', (langs: string[]) => {
  if (!Cypress.isBrowser({ family: 'chromium' })) {
    throw new Error(`cy.browserLanguages() needs a Chromium-based browser, not ${Cypress.browser.name}`);
  }
  return cy.window({ log: false }).then(async (win) => {
    languagesOverridden = true;
    await cdp('Network.setUserAgentOverride', { userAgent: win.navigator.userAgent, acceptLanguage: langs.join(',') });
    Cypress.log({ name: 'browserLanguages', message: langs.join(', ') });
  });
});

afterEach(() => {
  if (!languagesOverridden) return;
  languagesOverridden = false;
  // An empty user agent restores the browser defaults (languages included).
  cy.wrap(cdp('Network.setUserAgentOverride', { userAgent: '' }), { log: false });
});

Cypress.Commands.add('visitPage', (path, opts = {}) => {
  if (opts.browserLangs) cy.browserLanguages(opts.browserLangs);
  return cy.visit(path, {
    onBeforeLoad(win) {
      if (!opts.intro) win.sessionStorage.setItem('archivo115:intro-seen', '1');
      const lang = opts.lang === undefined ? 'es' : opts.lang;
      if (lang) win.localStorage.setItem('archivo115:lang', lang);
      if (opts.speech) installSpeech(win, opts.voices);
      if (opts.sound) win.localStorage.setItem('archivo115:sound', 'on');
      if (opts.reducedMotion || opts.mouse) {
        const real = win.matchMedia.bind(win);
        const fake = (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
        win.matchMedia = (q: string) =>
          (opts.reducedMotion && q.includes('prefers-reduced-motion')) || (opts.mouse && q.includes('pointer: fine')) ? fake(q) : real(q);
      }
    },
  });
});

Cypress.Commands.add('speech', () => cy.window().its('__speech' as never) as unknown as Cypress.Chainable<SpeechLog>);
