---
title: How to contribute
description: Add a map guide by writing a Markdown file.
---

Archive 115 is open source and bilingual. Each guide is **one Markdown file per language**: `src/content/maps/es/<game>/<map>.md` and its translation in `src/content/maps/en/<game>/<map>.md`. You do not need to touch any code: write plain Markdown and use a few "directives" for the special blocks (spoilers, enemy files, narration…). The site takes care of the design.

## House rules

1. **Spoiler-free by default.** Anything the game shows you in the first few minutes can be visible. Bosses, story twists and secret quest steps always go inside a spoiler.
2. **Nothing made up.** Every fact (location, cost, round, quest step, story event) must be verifiable on the Call of Duty Wiki. Tips and opinions are written as tips, never as facts.
3. **Context before instructions.** Explain what is going on and why, not just which button to press.
4. **Real, credited images.** Add them to `scripts/images.manifest.json` and download them with `npm run images`, which records where each one comes from.
5. **No video links.** The page should stand on its own.
6. **Both languages at once.** Every Spanish file has an English twin with the same spoilers and the same ids. The tests check it.

## Available directives

| Directive | What it does |
| --- | --- |
| `:::spoiler[Title]{level="boss"}` | Block locked behind the eye. Levels: `lore`, `boss`, `enemy`, `quest`, `ee`, `weapon`. |
| `:::dossier[Name]{img="…" threat="4" kind="boss"}` | Enemy or boss file, locked by default. Add `open` if it is not a spoiler. Use `teaser` for a visible hint and `codename` for the cover name. |
| `:::narration` | Text only the voice narrator says (not shown on screen). Use it for transitions and to summarise tables: the narrator skips them. |
| `:::callout{type="tip"}` | Highlighted note: `tip`, `warn`, `info` or `lore`. |
| `:::steps` | Wraps a numbered list to show it as quest steps. |
| `:::grid` + `:::card[Title]{img="…"}` | Card grid. |
| `:::quote{by="Character"}` | A character quote. |
| `::figure{src="…" caption="…"}` | Image with caption and automatic credit. Add `wide` so it is not tilted. |

A block closes with `:::`. When nesting blocks (a spoiler inside another), the outer one needs more colons: `::::spoiler` … `::::`.

So that spoiler progress carries over when switching language, give each spoiler the same `id` in both versions, for example `{id="the-ending"}`.

## Adding a map, step by step

Before you start you need Git and Node.js 24.15 or newer. Fork the repository, clone it and run `npm install`: it works the same on Windows, macOS and Linux. The full setup, the pull request workflow and fixes for common problems are in the repository's `CONTRIBUTING.md` file.

1. Copy `docs/map-template.md` to `src/content/maps/es/bo3/my-map.md` and `src/content/maps/en/bo3/my-map.md` (or switch an existing map from `stub` to `guide` in both languages).
2. Fill in the header block (title, date, location, colour…).
3. Write the guide with `##` headings for each section. **Do not put `##` headings inside a spoiler**: the side index would show them.
4. Run `npm run test:unit`. It checks that images exist and are credited, that both languages match and that the format is valid.
5. Run `npm run dev`, check the page in both languages and open a pull request with links to the wiki pages you used.
