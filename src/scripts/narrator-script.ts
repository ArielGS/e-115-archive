import { strings } from '../i18n/client';
import type { Lang } from '../i18n/ui';

// Builds what the voice narrator says from the rendered guide:
//  - headings, paragraphs, list items and quotes, in reading order;
//  - ":::narration" blocks, which are hidden on screen and exist only for
//    the voice (smoother transitions, context the page doesn't need);
//  - locked spoilers are announced by title and skipped, so listening never
//    spoils more than reading would. Revealed spoilers are read normally.

export interface Segment {
  text: string;
  /** Element to highlight while this segment is spoken. */
  el: Element;
  kind: 'heading' | 'text' | 'narration' | 'locked';
}

/** Spanish TTS voices mangle some English/German names; respell them. */
type Replacement = string | ((match: string) => string);

const plural = (one: string, many: string) => (m: string) => (/s$/i.test(m) ? many : one);

export const PRONUNCIATIONS: [RegExp, Replacement][] = [
  [/\bDer Eisendrache\b/g, 'Der Áisendraje'],
  [/\bRichtofen\b/g, 'Ríjtofen'],
  [/\bWunderwaffe\b/g, 'Vúnderwafe'],
  [/\bDG-2\b/g, 'de ge dos'],
  [/\bDG-4\b/g, 'de ge cuatro'],
  [/\bPack-a-Punch\b/g, 'Pak a Panch'],
  [/\bJuggernog\b/g, 'Yáguernog'],
  [/\bGobbleGums?\b/g, plural('Góbel-gum', 'Góbel-gums')],
  [/\bShadowman\b/g, 'Shádouman'],
  [/\bKeepers?\b/g, plural('Kíper', 'Kípers')],
  [/\bEaster eggs?\b/gi, plural('íster eg', 'íster egs')],
  [/\bPanzersoldat\b/g, 'Pánser-soldat'],
  [/\bMorg City\b/g, 'Morg Síti'],
  [/\bThe Giant\b/g, 'De Yáiant'],
  [/\bNacht der Untoten\b/g, 'Najt der Úntoten'],
  [/\bKino der Toten\b/g, 'Kíno der Tóten'],
  [/\bDer Riese\b/g, 'Der Ríse'],
  [/\bVerrückt\b/g, 'Ferrúkt'],
  [/\bTranZit\b/g, 'Tránsit'],
  [/\bThundergun\b/g, 'Zándergan'],
  [/\bStuhlinger\b/g, 'Stúlinguer'],
  [/\bDenizens?\b/g, plural('Dénisen', 'Dénisens')],
  [/\bT\.E\.D\.D\./g, 'Ted'],
  [/\b115\b/g, 'ciento quince'],
];

export function speakable(text: string, lang: Lang = 'es'): string {
  let out = text;
  // English voices already pronounce these names; only Spanish needs help.
  if (lang === 'es') for (const [re, rep] of PRONUNCIATIONS) out = typeof rep === 'string' ? out.replace(re, rep) : out.replace(re, rep);
  return out
    .replace(/[★☆▶■●◆→←]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Speech engines cut long utterances; split on sentence boundaries. */
export function chunk(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+(?:["”»)]+[.!?…]*)?\s*|[^.!?…]+$/g) ?? [text];
  const out: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= max) {
      current = (current + ' ' + s).trim();
      continue;
    }
    if (current) out.push(current);
    if (s.length <= max) {
      current = s;
    } else {
      // A single very long sentence: split on commas, then hard-wrap.
      let rest = s;
      while (rest.length > max) {
        const cut = Math.max(rest.lastIndexOf(', ', max), rest.lastIndexOf(' ', max));
        const at = cut > max / 2 ? cut + 1 : max;
        out.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    }
  }
  if (current) out.push(current);
  return out;
}

// Tables read badly aloud: summarise them in a :::narration block instead.
const SKIP = 'figure, button, script, style, svg, nav, table, .spoiler-confirm, .dossier-head, .no-tts, [data-no-tts]';
const BLOCKS = new Set(['P', 'UL', 'OL', 'BLOCKQUOTE', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'TABLE']);

const clean = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

export function buildScript(root: Element, intro?: string, lang: Lang = 'es'): Segment[] {
  const L = strings(lang);
  const out: Segment[] = [];
  if (intro) out.push({ text: intro, el: root, kind: 'narration' });

  const walk = (node: Element, inNarration: boolean) => {
    if (node.matches(SKIP)) return;
    if (node.matches('.narration')) {
      for (const child of node.children) walk(child, true);
      return;
    }
    if (node.matches('[data-spoiler]') && !node.classList.contains('is-open')) {
      const title = node.getAttribute('data-title') ?? 'spoiler';
      out.push({
        text: L.locked(title),
        el: node,
        kind: 'locked',
      });
      return;
    }
    // Hidden things are skipped, except narration blocks (hidden on purpose).
    if (!inNarration && node instanceof HTMLElement && node.hidden) return;

    const tag = node.tagName;
    const kind = inNarration ? 'narration' : 'text';
    if (/^H[1-4]$/.test(tag) || node.matches('.dossier-name, .card-title, .spoiler-title, .callout-label')) {
      const t = clean(node);
      if (t) out.push({ text: /[.!?…:]$/.test(t) ? t : `${t}.`, el: node, kind: inNarration ? 'narration' : 'heading' });
      return;
    }
    if (tag === 'P' || tag === 'TD' || tag === 'TH' || tag === 'DT' || tag === 'DD') {
      const t = clean(node);
      if (t) out.push({ text: t, el: node, kind });
      return;
    }
    if (tag === 'LI') {
      const hasBlocks = [...node.children].some((c) => BLOCKS.has(c.tagName));
      if (!hasBlocks) {
        const t = clean(node);
        if (t) out.push({ text: t, el: node, kind });
        return;
      }
    }
    for (const child of node.children) walk(child, inNarration);
  };

  for (const child of root.children) walk(child, false);
  return out;
}

/** Flattens segments into speakable utterances, keeping the source index. */
export function toUtterances(segments: Segment[], max = 220, lang: Lang = 'es'): { text: string; index: number }[] {
  return segments.flatMap((seg, index) => chunk(speakable(seg.text, lang), max).map((text) => ({ text, index })));
}
