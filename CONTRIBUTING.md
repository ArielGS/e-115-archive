# Contributing

Thanks for helping the archive grow. Most contributions are **content**: a new map guide or a fix to an existing one. Content is written in **Spanish and English** (one file per language); code, comments and commit messages are in **English**. Issues and pull requests can be written in either language.

If you work with an AI assistant, have it read [`AGENTS.md`](AGENTS.md) first. By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Getting started

### 1. Install the tools

| Tool | Version | How to get it |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | any recent | macOS: `xcode-select --install` · Windows: Git for Windows · Linux: your package manager |
| [Node.js](https://nodejs.org/) | **24.15 or newer 24.x** (see `.nvmrc`) | Recommended through a version manager: [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux), [nvm-windows](https://github.com/coreybutler/nvm-windows) or [fnm](https://github.com/Schniz/fnm) (all OSes). Then `nvm install` / `fnm use` in the project folder. |
| Docker or Podman | optional | Only to run the site in a container (`deployment/`). |

On **Linux**, Cypress also needs a few system libraries. On Ubuntu 24.04 or newer:

```bash
sudo apt-get install libgtk2.0-0t64 libgtk-3-0t64 libgbm-dev libnotify-dev libnss3 libxss1 libasound2t64 libxtst6 xauth xvfb
```

On older Ubuntu/Debian, drop the `t64` suffixes (`libgtk2.0-0 libgtk-3-0 … libasound2 …`). Other distributions: see [Cypress's Linux prerequisites](https://docs.cypress.io/app/get-started/install-cypress#Linux-Prerequisites). macOS and Windows need nothing extra.

### 2. Get the code

1. **Fork** the repository on GitHub (button at the top right).
2. Clone your fork and add the original as `upstream`:

   ```bash
   git clone https://github.com/<your-user>/e-115-archive.git
   cd e-115-archive
   git remote add upstream https://github.com/ArielGS/e-115-archive.git
   ```

### 3. Install and run

```bash
npm install          # also downloads the Cypress test browser (~500 MB, once per machine)
npm run dev          # http://localhost:4321 (Spanish) and http://localhost:4321/en/ (English)
```

### 4. Run the tests

```bash
npm run test:unit    # ~30 s: content rules, ES/EN parity, directives, scripts
npm run test:e2e     # builds the site and runs Cypress headless (~2 min)
npm test             # both
npm run cy:open      # Cypress's interactive window, handy to debug one spec
```

The same commands work in macOS Terminal, Linux shells, PowerShell, Command Prompt and Git Bash, and in VS Code's integrated terminal.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm warn EBADENGINE … node` | Your Node is too old. `nvm install` (or `fnm use`) in the project folder, then `npm ci`. |
| `Cypress verification timed out` / `Cypress binary is missing` | `npx cypress install`, then `npx cypress verify`. Behind a proxy, set `HTTP_PROXY` first. |
| You only edit content and do not want the Cypress download | `CYPRESS_INSTALL_BINARY=0 npm install` (PowerShell: `$env:CYPRESS_INSTALL_BINARY=0; npm install`). Unit tests and the dev server still work. |
| Port 4321 is busy | Stop the other `npm run dev`/`preview`, or run `npm run dev -- --port 4322`. |
| Windows: files show every line as changed | The repository stores LF line endings (`.gitattributes`). Run `git add --renormalize .` once, or clone again. |
| Windows: the project is inside OneDrive and installs are very slow | Move the clone outside synced folders (e.g. `C:\dev\`). |

## How a change gets in

1. **Find or open an issue.** Check the [issues](../../issues) first; for a map guide, open a *Map guide* issue to claim it so two people do not write the same one. Small fixes (typos, a wrong number) can go straight to a pull request.
2. **Create a branch** from an up-to-date `main`:

   ```bash
   git switch main && git pull upstream main
   git switch -c guide/mob-of-the-dead      # or fix/…, feat/…, docs/…
   ```

3. **Make the change** following the rules below, with tests for any new behaviour.
4. **Run `npm test`** and check the pages you touched in both languages, on a phone-sized window too.
5. **Commit** in English, imperative mood, one topic per commit: `Add Mob of the Dead guide`, `Fix Pack-a-Punch cost in The Giant`.
6. **Push and open a pull request** against `main`. Fill in the template: what changed, the wiki pages you used, and the checklist.
7. **CI and review.** GitHub runs the unit tests and the build on Linux, macOS and Windows, plus Cypress. A maintainer reviews every pull request; nothing reaches `main` without a pull request and green checks. Answer review comments by pushing new commits to the same branch. Pull requests are squash-merged.

## Add or finish a map guide

1. Pick a map. Pending maps already exist as `status: stub` in `src/content/maps/es/<era>/` and `src/content/maps/en/<era>/`.
2. Copy the structure from [`docs/map-template.md`](docs/map-template.md) (or from an existing guide such as `src/content/maps/es/bo3/the-giant.md`).
3. Add the images you need to `scripts/images.manifest.json`, using the exact file name from the Call of Duty Wiki, then run:

   ```bash
   npm run images
   ```

   This downloads them as WebP into `public/images/` and records each source in `src/data/image-credits.json`. Never add an image by hand: the tests fail if an image has no credit.
4. Write the guide. The rules:
   - **Spoiler-safe by default.** Anything the game shows in the first minutes can be visible. Bosses, story twists and Easter egg steps go inside `:::spoiler` or `:::dossier`.
   - **Context before instructions.** Explain what is going on, not only which button to press.
   - **No video links.**
   - **Verify every fact** against the Call of Duty Wiki and link the pages you used in the pull request. Nothing made up; tips must read as tips.
   - Neutral Spanish (`tú` / `ustedes`), short paragraphs.
   - No `##` headings inside spoilers (the table of contents would leak them). `###` is fine.
   - Tables are skipped by the narrator: add a `:::narration` summary after them.
5. Translate the guide into the other language. Keep the same front matter data, images and spoiler ids (in the English file write `{id="<spanish-id>"}` on each spoiler and dossier). The tests fail if the two versions drift apart.
6. Change `status` to `guide` in both files, then run `npm test` and check both pages (`/…` and `/en/…`) with `npm run dev`, on a phone-sized window too.

## Directives cheat sheet

```md
:::spoiler[Visible title]{level="boss"}       ← lore | boss | enemy | quest | ee | weapon
Hidden content.
:::

:::dossier[Real name]{kind="boss" threat="4" teaser="Visible hint" codename="File 01" img="/images/…"}
Locked file. Add `open` so it is not a spoiler.
:::

:::narration
Only the voice narrator says this.
:::

:::callout{type="tip"}   ← tip | warn | info | lore
:::steps                 ← wraps an ordered list
::::grid + :::card[Title]{img="/images/…" tag="Label"}
:::quote{by="Character"}
::figure{src="/images/…" caption="Caption" wide}
```

A container closes with `:::`. When nesting, the outer fence needs more colons (`::::grid` … `::::`). Unknown directives fail the build with the file and line.

## Code changes

- `npm run test:unit` and `npm run test:e2e` must stay green, and new behaviour needs tests (Vitest in `tests/unit` for logic, Cypress in `cypress/e2e` for user flows). Do not delete or weaken a test to make it pass.
- Keep it static: no backend, no tracking, no external CDNs.
- Respect `prefers-reduced-motion` in any new animation.
- Use `url()` from `src/lib/site.ts` for internal links (the site can be hosted under a sub-path).
- Use POSIX-style paths in code that compares or splits paths (`path.relative()` returns `\` on Windows); CI runs on all three OSes and will catch it.

## Licensing of contributions

By opening a pull request you agree that your **code** is released under the [MIT license](LICENSE) and your **guide text** under [CC BY-SA 4.0](LICENSE-CONTENT.md), the same terms as the rest of the project. Only submit work you wrote yourself or that is compatible with those licenses; do not paste text from other guides or sites.

## Security

Found a vulnerability? Do not open an issue; follow [SECURITY.md](SECURITY.md).
