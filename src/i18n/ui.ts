// UI strings and localized routes. Spanish lives at the site root, English
// under /en/. Content (Markdown) is translated per file in src/content/<collection>/<lang>/.

export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'es';
export const LANG_STORAGE_KEY = 'archivo115:lang';

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** Page slugs that differ per language. Maps share their slug. */
const PAGE_SLUGS = {
  contribute: { es: '/contribuir/', en: '/contribute/' },
  credits: { es: '/creditos/', en: '/credits/' },
  story: { es: '/historia/', en: '/story/' },
  quests: { es: '/misiones/', en: '/quests/' },
} as const;
export type PageKey = keyof typeof PAGE_SLUGS;

/** Root-relative path (without base) for a path in a given language. */
export function localePath(lang: Lang, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return lang === DEFAULT_LANG ? clean : `/${lang}${clean}`;
}

export function pagePath(lang: Lang, page: PageKey): string {
  return localePath(lang, PAGE_SLUGS[page][lang]);
}

/** Strips the language prefix: "/en/bo3/x/" -> { lang: "en", path: "/bo3/x/" }. */
export function splitLangPath(path: string): { lang: Lang; path: string } {
  const m = path.match(/^\/(en)(\/.*|$)/);
  if (m) return { lang: 'en', path: m[2] || '/' };
  return { lang: DEFAULT_LANG, path: path || '/' };
}

/** Equivalent path of the same page in another language. */
export function switchPath(path: string, to: Lang): string {
  const { lang, path: rest } = splitLangPath(path);
  for (const slugs of Object.values(PAGE_SLUGS)) {
    if (rest === slugs[lang] || rest === slugs[lang].replace(/\/$/, '')) return localePath(to, slugs[to]);
  }
  return localePath(to, rest);
}

/**
 * Language a visitor should see: their saved choice first; otherwise the first
 * language in the browser's preference list that the site supports; English
 * for any other language; Spanish when the browser says nothing.
 * Keep in sync with the inline script in Base.astro.
 */
export function preferredLang(saved: string | null, browserLangs: readonly string[]): Lang {
  if (isLang(saved)) return saved;
  const list = browserLangs.filter(Boolean).map((l) => l.toLowerCase());
  if (!list.length) return DEFAULT_LANG;
  const match = list.map((l) => l.slice(0, 2)).find(isLang);
  return match ?? 'en';
}

/**
 * Search engine crawlers must see every language at its own URL: redirecting
 * them (Googlebot browses in English) would hide the Spanish pages from search.
 */
const CRAWLER_PATTERN = 'bot|crawl|spider|slurp|mediapartners|lighthouse|bingpreview|facebookexternalhit';
export const isCrawler = (userAgent: string) => new RegExp(CRAWLER_PATTERN, 'i').test(userAgent);

/**
 * Inline <head> script that sends the visitor to their language before the
 * page paints. Same rules as preferredLang(); unit-tested by running it.
 * Crawlers are never redirected (see isCrawler).
 */
export function detectScript(opts: { lang: Lang; alternates: Record<string, string>; detect: boolean }): string {
  const cfg = JSON.stringify({ ...opts, key: LANG_STORAGE_KEY, bots: CRAWLER_PATTERN });
  return `(function(c){try{
if(new RegExp(c.bots,'i').test(navigator.userAgent||''))return;
var saved=localStorage.getItem(c.key);
var list=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']).filter(Boolean);
var want=saved==='es'||saved==='en'?saved:null;
if(!want){want=list.length?'en':'es';for(var i=0;i<list.length;i++){var code=String(list[i]).slice(0,2).toLowerCase();if(code==='es'||code==='en'){want=code;break;}}}
if(c.detect&&want!==c.lang&&c.alternates[want])location.replace(c.alternates[want]+location.search+location.hash);
}catch(e){}})(${cfg});`;
}

const es = {
  'site.name': 'Archivo 115',
  /** Word shown before "115" in the logo and the home title. */
  'site.word': 'ARCHIVO',
  'site.tagline': 'Guía de Call of Duty Zombies sin spoilers',
  'site.description':
    'Guía visual y sin spoilers de Call of Duty Zombies: la historia completa de World at War a Black Ops 4, contexto de cada juego, guías de Nacht der Untoten, Kino der Toten, TranZit, Shadows of Evil, The Giant, Der Eisendrache y Blood of the Dead, y checklists de cada misión secreta, con spoilers bloqueados y narrador por voz.',
  'skip': 'Saltar al contenido',
  'nav.label': 'Principal',
  'nav.home': 'Inicio',
  'nav.story': 'Historia',
  'nav.quests': 'Misiones',
  'nav.games': 'Juegos',
  'nav.gamesLabel': 'Elige un juego',
  'nav.contribute': 'Contribuir',
  'nav.credits': 'Créditos',
  'nav.sound': 'Sonido',
  'nav.lang': 'Idioma',
  'logo.home': 'Archivo 115, inicio',
  'logo.eye': 'Ojo zombi: haz clic para despertarlo',
  'ticker': [
    'Transmisión entrante desde el Archivo 115',
    'Todo lo que puede arruinarte la sorpresa está bloqueado con un ojo',
    'Activa el narrador en cualquier guía para escucharla en voz alta',
    'Consejo: compra Juggernog antes de la ronda 10',
    'Las barricadas también dan puntos: repáralas',
    'Ningún video de YouTube fue necesario para hacer esta página',
    'Guías disponibles: Nacht der Untoten · Kino der Toten · TranZit · Shadows of Evil · The Giant · Der Eisendrache · Blood of the Dead',
    'Nuevo: la historia completa hasta el final del Éter y checklists de cada misión secreta',
  ],
  'footer.fan':
    'Proyecto de fans, gratuito y de código abierto. No está afiliado a Activision ni a Treyarch. Call of Duty y todo su contenido son marcas y propiedad de sus dueños.',
  'footer.images': 'Imágenes: Call of Duty Wiki, con la fuente de cada una en',
  'footer.contribute': '¿Quieres añadir un mapa? Así se contribuye →',
  'footer.source': 'Código fuente en GitHub',
  'intro.label': 'Pantalla de carga',
  'intro.title': 'CARGANDO ARCHIVO',
  'intro.loading': 'Cargando',
  'intro.lines': [
    'Conectando con el Archivo 115',
    'Descifrando expedientes del Grupo 935',
    'Bloqueando spoilers con el ojo',
    'Calibrando el narrador',
    'Ocultando a Samantha… o eso creemos',
  ],
  'intro.sound': 'Entrar con sonido',
  'intro.nosound': 'Entrar sin sonido',
  'intro.skip': 'Saltar intro >>',
  'home.kicker': 'Transmisión 115 // en vivo',
  'home.sub':
    'Archivo hecho por fans, con guías claras, visuales y con spoilers opcionales para tener la mejor experiencia posible a la hora de jugar Call of Duty Zombies.',
  'home.cta.basics': '¿Qué es Zombies?',
  'home.cta.story': 'La historia completa',
  'home.cta.games': 'Elegir juego',
  'home.console.label': 'Estado del archivo',
  'home.console': [
    'Jugadores: 1 a 4 (mejor en pareja)',
    'Juegos: WaW · BO1 · BO2 · BO3 · BO4',
    'Guías completas: {guides}',
    'Spoilers: bloqueados con el ojo',
    'Narrador por voz: disponible',
  ],
  'home.console.wait': 'Esperando orden',
  'home.basics': 'Manual de supervivencia',
  'modal.close': 'Cerrar',
  'home.eras': 'Elige tu juego',
  'home.eras.sub':
    'Cada juego cuenta una parte de la historia. Elige el tuyo para ver quiénes son los protagonistas, qué cambia en la jugabilidad y qué mapas tienen guía.',
  'tabs.label': 'Elige un juego',
  'era.crew': 'Personajes jugables',
  'era.wiki': 'Más en la Call of Duty Wiki ↗',
  'era.maps': 'Mapas de {code}',
  'card.guide': 'Guía disponible',
  'card.stub': 'Sin expediente',
  'card.alt': 'Pantalla de selección de {title}',
  'map.listen': '▶ Escuchar guía',
  'map.revealed': 'Spoilers revelados',
  'map.hideAll': 'Ocultar todo',
  'map.sections': 'Secciones',
  'map.sectionsLabel': 'Secciones de la guía',
  'map.back': '← Mapas de {code}',
  'map.edit': 'Editar esta guía',
  'map.prev': '← Anterior',
  'map.next': 'Siguiente →',
  'map.otherMaps': 'Otros mapas',
  'map.place': 'Lugar',
  'map.released': 'Lanzamiento',
  'map.difficulty': 'Dificultad',
  'stub.label': 'Expediente pendiente',
  'stub.text':
    'Esta guía todavía no está escrita. El proyecto es abierto: cualquiera puede añadirla escribiendo un archivo Markdown con el mismo formato que las guías existentes.',
  'stub.cta': 'Cómo escribir esta guía',
  'stub.back': 'Volver a {code}',
  'narrator.open': 'Narrador',
  'narrator.label': 'Narrador por voz',
  'narrator.title': 'Transmisión',
  'narrator.close': 'Cerrar narrador',
  'narrator.minimize': 'Minimizar narrador (el audio sigue)',
  'narrator.prev': 'Anterior',
  'narrator.play': 'Reproducir',
  'narrator.next': 'Siguiente',
  'narrator.stop': 'Detener',
  'narrator.voice': 'Voz',
  'narrator.speed': 'Velocidad',
  'narrator.slow': 'Lenta',
  'narrator.normal': 'Normal',
  'narrator.fast': 'Rápida',
  'narrator.faster': 'Muy rápida',
  'narrator.ambient': 'Ambiente',
  'narrator.follow': 'Seguir texto',
  'narrator.ready': 'Listo para transmitir',
  'narrator.hint': 'Voz gratuita de tu navegador. Los spoilers bloqueados se saltan hasta que los abras.',
  'narrator.recording': 'Efecto grabación',
  'narrator.voiceTip':
    '¿Suena robótica? Abre la guía en Microsoft Edge para usar sus voces «Natural», o en Mac/iPhone descarga una voz «Mejorada» en Ajustes › Accesibilidad › Contenido leído.',
  'credits.title': 'Créditos',
  'credits.p1':
    'Todas las imágenes de este sitio son capturas, renders o arte promocional de Call of Duty, propiedad de Activision y Treyarch, obtenidas de la Call of Duty Wiki (Fandom). Se usan con fines informativos y sin ánimo de lucro, y cada una enlaza a su página de origen.',
  'credits.p2':
    'El lore y los pasos de las guías se contrastaron con los artículos de esa misma wiki. Los textos de este sitio son originales y se escribieron para este proyecto.',
  'credits.p3': 'Si eres titular de alguna imagen y prefieres que no aparezca, abre un issue en el repositorio y la retiraremos.',
  'credits.image': 'Imagen',
  'credits.local': 'Archivo en este sitio',
  'credits.original': 'Archivo original',
  'contribute.repo': 'Abrir el repositorio',
  'seo.guideTitle': 'Guía de {title} · {game} Zombies',
  'seo.guideDesc': 'Guía sin spoilers de {title} ({game} Zombies). {tagline} Objetivo, Pack-a-Punch, enemigos y Easter eggs bajo spoiler, con narrador.',
  'seo.storyTitle': 'Historia de Call of Duty Zombies: la saga del Éter explicada',
  'quests.kicker': 'Lista de tareas // Misiones secretas',
  'quests.lists': 'Listas',
  'quests.steps': 'Pasos',
  'quests.saved': 'Progreso',
  'quests.savedValue': 'Guardado en este navegador',
  'story.kicker': 'Expediente maestro // Saga del Éter',
  'story.listen': '▶ Escuchar la historia',
  'story.games': 'Juegos',
  'story.span': '1294 · 1918 · 1945 · 1963 · 2025 · 2035',
  'story.period': 'Época',
  'story.crews': 'Protagonistas',
};

type Dict = { [K in keyof typeof es]: (typeof es)[K] extends string[] ? string[] : string };

const en: Dict = {
  'site.name': 'Archive 115',
  'site.word': 'ARCHIVE',
  'site.tagline': 'A spoiler-free Call of Duty Zombies guide',
  'site.description':
    'A visual, spoiler-free guide to Call of Duty Zombies: the full story from World at War to Black Ops 4, context for every game, guides for Nacht der Untoten, Kino der Toten, TranZit, Shadows of Evil, The Giant, Der Eisendrache and Blood of the Dead, and checklists for every secret quest, with locked spoilers and a voice narrator.',
  'skip': 'Skip to content',
  'nav.label': 'Main',
  'nav.home': 'Home',
  'nav.story': 'Story',
  'nav.quests': 'Quests',
  'nav.games': 'Games',
  'nav.gamesLabel': 'Pick a game',
  'nav.contribute': 'Contribute',
  'nav.credits': 'Credits',
  'nav.sound': 'Sound',
  'nav.lang': 'Language',
  'logo.home': 'Archive 115, home',
  'logo.eye': 'Zombie eye: click to wake it up',
  'ticker': [
    'Incoming transmission from Archive 115',
    'Anything that could spoil the surprise is locked behind an eye',
    'Turn on the narrator in any guide to hear it read aloud',
    'Tip: buy Juggernog before round 10',
    'Barriers give points too: rebuild them',
    'No YouTube videos were needed to make this page',
    'Guides available: Nacht der Untoten · Kino der Toten · TranZit · Shadows of Evil · The Giant · Der Eisendrache · Blood of the Dead',
    'New: the full story to the end of the Aether, and checklists for every secret quest',
  ],
  'footer.fan':
    'A free, open-source fan project. Not affiliated with Activision or Treyarch. Call of Duty and all related content are trademarks and property of their owners.',
  'footer.images': 'Images: Call of Duty Wiki, with the source of each one in',
  'footer.contribute': 'Want to add a map? Here is how to contribute →',
  'footer.source': 'Source code on GitHub',
  'intro.label': 'Loading screen',
  'intro.title': 'LOADING ARCHIVE',
  'intro.loading': 'Loading',
  'intro.lines': [
    'Connecting to Archive 115',
    'Decrypting Group 935 files',
    'Locking spoilers behind the eye',
    'Calibrating the narrator',
    'Hiding Samantha… or so we think',
  ],
  'intro.sound': 'Enter with sound',
  'intro.nosound': 'Enter without sound',
  'intro.skip': 'Skip intro >>',
  'home.kicker': 'Transmission 115 // live',
  'home.sub':
    'A fan-made archive with clear, visual guides and optional spoilers, for the best possible experience when you play Call of Duty Zombies.',
  'home.cta.basics': 'What is Zombies?',
  'home.cta.story': 'The full story',
  'home.cta.games': 'Pick a game',
  'home.console.label': 'Archive status',
  'home.console': [
    'Players: 1 to 4 (best as a duo)',
    'Games: WaW · BO1 · BO2 · BO3 · BO4',
    'Full guides: {guides}',
    'Spoilers: locked behind the eye',
    'Voice narrator: available',
  ],
  'home.console.wait': 'Awaiting orders',
  'home.basics': 'Survival manual',
  'modal.close': 'Close',
  'home.eras': 'Pick your game',
  'home.eras.sub':
    'Each game tells part of the story. Pick yours to meet its characters, see what changes in the gameplay and find which maps have a guide.',
  'tabs.label': 'Pick a game',
  'era.crew': 'Playable characters',
  'era.wiki': 'More on the Call of Duty Wiki ↗',
  'era.maps': '{code} maps',
  'card.guide': 'Guide available',
  'card.stub': 'No file yet',
  'card.alt': '{title} map selection screen',
  'map.listen': '▶ Listen to the guide',
  'map.revealed': 'Spoilers revealed',
  'map.hideAll': 'Hide all',
  'map.sections': 'Sections',
  'map.sectionsLabel': 'Guide sections',
  'map.back': '← {code} maps',
  'map.edit': 'Edit this guide',
  'map.prev': '← Previous',
  'map.next': 'Next →',
  'map.otherMaps': 'Other maps',
  'map.place': 'Location',
  'map.released': 'Released',
  'map.difficulty': 'Difficulty',
  'stub.label': 'File pending',
  'stub.text':
    'This guide has not been written yet. The project is open: anyone can add it by writing a Markdown file in the same format as the existing guides.',
  'stub.cta': 'How to write this guide',
  'stub.back': 'Back to {code}',
  'narrator.open': 'Narrator',
  'narrator.label': 'Voice narrator',
  'narrator.title': 'Transmission',
  'narrator.close': 'Close narrator',
  'narrator.minimize': 'Minimise narrator (audio keeps playing)',
  'narrator.prev': 'Previous',
  'narrator.play': 'Play',
  'narrator.next': 'Next',
  'narrator.stop': 'Stop',
  'narrator.voice': 'Voice',
  'narrator.speed': 'Speed',
  'narrator.slow': 'Slow',
  'narrator.normal': 'Normal',
  'narrator.fast': 'Fast',
  'narrator.faster': 'Very fast',
  'narrator.ambient': 'Ambience',
  'narrator.follow': 'Follow text',
  'narrator.ready': 'Ready to transmit',
  'narrator.hint': "Your browser's free built-in voice. Locked spoilers are skipped until you open them.",
  'narrator.recording': 'Recording effect',
  'narrator.voiceTip':
    'Sounds robotic? Open the guide in Microsoft Edge to use its "Natural" voices, or on Mac/iPhone download an "Enhanced" voice in Settings › Accessibility › Spoken Content.',
  'credits.title': 'Credits',
  'credits.p1':
    'Every image on this site is a screenshot, render or promotional artwork from Call of Duty, owned by Activision and Treyarch, taken from the Call of Duty Wiki (Fandom). They are used for informational, non-commercial purposes, and each one links to its source page.',
  'credits.p2':
    "The lore and the guides' steps were checked against that same wiki. The texts on this site are original and were written for this project.",
  'credits.p3': 'If you own any of these images and would rather it not appear here, open an issue in the repository and we will remove it.',
  'credits.image': 'Image',
  'credits.local': 'File on this site',
  'credits.original': 'Original file',
  'contribute.repo': 'Open the repository',
  'seo.guideTitle': '{title} guide · {game} Zombies',
  'seo.guideDesc': 'Spoiler-free guide to {title} ({game} Zombies). {tagline} Objective, Pack-a-Punch, enemies and Easter eggs behind spoilers, with a narrator.',
  'seo.storyTitle': 'Call of Duty Zombies story: the Aether Saga explained',
  'quests.kicker': 'Task list // Secret quests',
  'quests.lists': 'Lists',
  'quests.steps': 'Steps',
  'quests.saved': 'Progress',
  'quests.savedValue': 'Saved in this browser',
  'story.kicker': 'Master file // The Aether Saga',
  'story.listen': '▶ Listen to the story',
  'story.games': 'Games',
  'story.span': '1294 · 1918 · 1945 · 1963 · 2025 · 2035',
  'story.period': 'Period',
  'story.crews': 'Heroes',
};

export const ui: Record<Lang, Dict> = { es: es as Dict, en };
export type UiKey = keyof Dict;

/** Translates a key, filling {placeholders}. */
export function t(lang: Lang, key: UiKey, vars: Record<string, string | number> = {}): string {
  const value = ui[lang][key] ?? ui[DEFAULT_LANG][key];
  const text = Array.isArray(value) ? value.join('|') : value;
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function tList(lang: Lang, key: UiKey, vars: Record<string, string | number> = {}): string[] {
  const value = ui[lang][key];
  return (Array.isArray(value) ? value : [value]).map((s) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)));
}
