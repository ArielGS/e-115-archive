# Archive 115

**A spoiler-safe Call of Duty Zombies guide in Spanish and English, styled like a 2000s Flash site.** Live at <https://e-115-archive.vercel.app> · Source at <https://github.com/ArielGS/e-115-archive>. The site is called *Archive 115* in English and *Archivo 115* in Spanish.

The full Aether Saga story on one narrated page, context for World at War and Black Ops 1 to 4, full guides for *Nacht der Untoten*, *Kino der Toten*, *TranZit*, *Shadows of Evil*, *The Giant*, *Der Eisendrache* and *Blood of the Dead*, interactive checklists for every secret quest, bosses and lore locked behind an eye that you decide to open, and a free voice narrator to listen to every guide. Content is plain Markdown; the site turns it into the custom UI. Code and repository documentation are in English; the guides are written in both languages.

## Features

- **Two languages.** Spanish at `/`, English at `/en/`. The browser language picks the default; the ES | EN switch in the header remembers your choice and keeps you on the same page (and section).
- **Era tabs** (WaW / BO1 / BO2 / BO3 / BO4) with story context, playable crews (each one links to its Call of Duty Wiki article) and every map of each game.
- **Story page** (`/historia/`, `/en/story/`): the whole Aether Saga in story order, from Nacht der Untoten to Tag der Toten, with every twist locked, Richtofen's files and a glossary. The voice narrator reads it too.
- **Quest checklists** (`/misiones/`, `/en/quests/`): the main Easter egg of every map with a guide as tickable steps with hints, locked behind spoilers, saved in the browser and shared between both languages.
- **Map guides** with objective, first rounds, buildables, enemies and the main Easter egg.
- **Spoiler eye**: bosses, lore twists and quest steps stay locked until you confirm. Progress is remembered per guide (in both languages), so the page "unlocks" as you play.
- **Verified content**: every fact in the guides and the story page was checked against the Call of Duty Wiki; see [`docs/audit-bo3.md`](docs/audit-bo3.md) and [`docs/audit-story-and-classic-guides.md`](docs/audit-story-and-classic-guides.md).
- **Voice narrator**: reads the guide with the browser's free Web Speech API, skips locked spoilers, adds lines that exist only in audio, and plays a synthesized ambience per map plus an optional "recording" effect (tape hiss, crackle, radio clicks). The narrator panel can be minimised to a compact bar while it keeps reading. It picks the most natural voice the browser offers (Edge's "Natural" voices, Apple's Enhanced/Premium voices) and suggests where to get one when only robotic voices are available. No servers, no API keys.
- **Flash-era feel**: preloader with "enter with / without sound", bevelled chrome stage, pixel fonts, scanlines, ticker, glitch titles, a neon-flickering logo, synthesized UI sounds, looping background music that dips under the voice narrator (all sound opt-in, files in `public/sounds`) and page wipes. Everything respects `prefers-reduced-motion`.
- **Real images** from the Call of Duty Wiki, downloaded by a script that records the source of each file and shows it on the page.
- Static site: no database, no CDN, no backend. Works on phones, tablets and desktops.
- **Search-engine ready**: sitemap with `hreflang`, robots.txt, canonical links, social cards and structured data; crawlers are never redirected between languages. Setup for Google Search Console in [`docs/seo.md`](docs/seo.md).

## Quick start

Needs [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) 24.15+ (`.nvmrc`). Works on macOS, Linux and Windows; full setup, per-OS notes and troubleshooting are in [CONTRIBUTING.md](CONTRIBUTING.md#getting-started).

```bash
nvm install        # or: fnm use (reads .nvmrc)
npm install        # also downloads Cypress for the functional tests
npm run dev        # http://localhost:4321
```

### One command, in a container (Docker or Podman)

```bash
./deployment/deploy.sh          # macOS / Linux
deployment\deploy.cmd           # Windows (double-click works too)
```

The script uses Docker if it is installed and running, otherwise Podman (starting its virtual machine if needed), builds the image, waits until the site answers and opens http://localhost:8080. Other actions: `down`, `restart`, `logs`, `status`, `test` (runs the whole Cypress suite against the container). Options: `PORT=9000`, `ENGINE=podman`, `NO_OPEN=1`.

The image is a two-stage build (Node builds the static site, nginx serves it). By hand: `docker compose up --build` or `podman compose up --build`.

## Tests

| Command | What it runs |
| --- | --- |
| `npm run test:unit` | Vitest: Markdown directives, i18n (routes, detection script), spoiler storage, narrator script, tabs, and **validation of every content file** (schema, images exist and are credited, no section headings inside spoilers, no video links, guide structure, **Spanish/English parity**). |
| `npm run test:e2e` | Builds, serves and runs Cypress: intro, tabs, spoiler confirm/persist/reset, narrator (with a fake speech engine), language detection and switch, **responsive checks on six phones and tablets**, image loading, broken links, 404. |
| `npm test` | Both. |

The commands work the same in any terminal, VS Code's included (`scripts/cypress.mjs` clears the `ELECTRON_RUN_AS_NODE` variable VS Code sets, which would otherwise break Cypress). CI runs the unit tests and the build on Linux, macOS and Windows, and Cypress on Linux.

## Free deployment

- **Vercel** (recommended, production: **https://e-115-archive.vercel.app**): import the GitHub repo at vercel.com and name the project `e-115-archive` (the `*.vercel.app` address comes from the project name; rename it later in *Settings → General* if needed). Nothing else to configure. `vercel.json` fixes the install (no Cypress download), runs the unit tests before every build, serves `dist` with trailing slashes and cache headers. The site URL (canonical and `hreflang` links) and the "edit this page" links come from Vercel's own build variables, so forks deployed under another name work too. Free on the Hobby plan (personal, non-commercial); custom domains in *Settings → Domains*.
- **GitHub Pages** (included): push to `main` and enable *Settings → Pages → Source: GitHub Actions*. `.github/workflows/deploy.yml` sets the sub-path and the "edit this page" links automatically.
  - **Custom domain:** add a repository variable `CUSTOM_DOMAIN` (e.g. `archivo115.com`) under *Settings → Secrets and variables → Actions → Variables*, set the same domain in *Settings → Pages → Custom domain*, and point your DNS at GitHub Pages. The workflow then builds for the domain root.
- **Netlify / Cloudflare Pages / Vercel**: build command `npm run build`, output folder `dist`.
- **Any server**: `docker compose up -d`.

Environment variables (see `.env.example`): `BASE_PATH` (sub-folder hosting), `SITE_URL`, `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` (free search-engine verification, see [`docs/seo.md`](docs/seo.md)), `PUBLIC_REPO_URL` (repository behind the "contribute" and "edit this page" links; defaults to <https://github.com/ArielGS/e-115-archive>).

## Project layout

```
src/content/               ← all the writing lives here (Markdown), one folder per language
  pages/{es,en}/basics.md    home "survival manual"
  pages/{es,en}/story.md     the full story page
  pages/{es,en}/quests.md    the quest checklists
  eras/{es,en}/waw|bo1|bo2|bo3|bo4.md  era tabs
  maps/{es,en}/<era>/<map>.md  one file per map and language (status: guide | stub)
src/i18n/                  UI strings, localized routes, language detection
src/views/                 page templates shared by both languages
src/lib/remark-zombies.ts   Markdown directives → custom HTML
src/lib/schema.ts           front matter schemas (shared with tests)
src/scripts/                client behaviour (spoilers, narrator, tabs, intro, fx, audio)
src/styles/                 tokens, Flash chrome, prose, pages
scripts/fetch-images.mjs    downloads wiki images + records credits
tests/unit, cypress/e2e     test suites
```

## Contributing

Contributions are welcome, in Spanish or English. Every change goes through a pull request with green CI and a review; report bugs and content errors through the [issue forms](../../issues/new/choose). Start with [CONTRIBUTING.md](CONTRIBUTING.md) (setup, workflow, rules), and please follow the [code of conduct](CODE_OF_CONDUCT.md). Security problems: [SECURITY.md](SECURITY.md). Maintainers: one-time GitHub settings are in [docs/repository-setup.md](docs/repository-setup.md).

## Writing content

See [CONTRIBUTING.md](CONTRIBUTING.md#add-or-finish-a-map-guide) and the in-site page `/contribuir/` (`/en/contribute/`). A new map is one Markdown file per language; the template is in [`docs/map-template.md`](docs/map-template.md).

**Using an AI assistant?** Point it at [`AGENTS.md`](AGENTS.md): it lists the rules (no invented facts, both languages in sync, tests for every change) and the definition of done.

## License and credits

- Code: [MIT](LICENSE).
- Guide texts: written for this project, [CC BY-SA 4.0](LICENSE-CONTENT.md) (the same license family as the Call of Duty Wiki they are checked against).
- Images and game names: © Activision / Treyarch, sourced from the [Call of Duty Wiki](https://callofduty.fandom.com/); each image links to its wiki file page (see `/creditos/`). They are not covered by the licenses above. This is a non-commercial fan project, not affiliated with Activision or Treyarch.

Details in [LICENSE-CONTENT.md](LICENSE-CONTENT.md).
