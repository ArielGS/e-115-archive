// Small set of strings used by client scripts. The page language comes from
// <html lang>, so scripts never need the full UI dictionary.
import type { Lang } from './ui';

const STRINGS = {
  es: {
    reveal: 'Revelar',
    hide: 'Ocultar',
    play: 'Reproducir',
    pause: 'Pausar',
    ready: 'Listo para transmitir',
    playing: 'Transmitiendo…',
    paused: 'En pausa',
    finished: 'Fin de la transmisión',
    noVoice: 'Tu navegador no tiene voz integrada. Prueba con Chrome, Edge o Safari.',
    otherVoices: 'Otros idiomas',
    minimize: 'Minimizar narrador (el audio sigue)',
    expand: 'Expandir narrador',
    locked: (title: string) => `Hay un expediente bloqueado: «${title}». Lo salto para no hacerte spoiler; ábrelo con el ojo cuando quieras.`,
  },
  en: {
    reveal: 'Reveal',
    hide: 'Hide',
    play: 'Play',
    pause: 'Pause',
    ready: 'Ready to transmit',
    playing: 'Transmitting…',
    paused: 'Paused',
    finished: 'End of transmission',
    noVoice: 'Your browser has no built-in voice. Try Chrome, Edge or Safari.',
    otherVoices: 'Other languages',
    minimize: 'Minimise narrator (audio keeps playing)',
    expand: 'Expand narrator',
    locked: (title: string) => `There is a locked file: "${title}". I will skip it so nothing is spoiled; open it with the eye whenever you want.`,
  },
} as const;

export type ClientStrings = (typeof STRINGS)[Lang];

export function pageLang(): Lang {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'es';
}

export function strings(lang: Lang = pageLang()): ClientStrings {
  return STRINGS[lang];
}
