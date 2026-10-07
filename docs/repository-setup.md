# Repository setup (maintainers)

The files in `.github/` already define how the project works as open source. A few things are GitHub **settings**, not files, and have to be switched on once by a repository admin. Do this right after pushing the repository for the first time.

## What the files already do

| File | Effect |
| --- | --- |
| `.github/CODEOWNERS` | Every pull request asks `@ArielGS` for review. |
| `.github/ISSUE_TEMPLATE/*` | Issues use a form: bug, content error, map guide, feature. Blank issues are off. |
| `.github/pull_request_template.md` | Every PR starts with the definition-of-done checklist. |
| `.github/workflows/ci.yml` | Unit tests + build on Linux, macOS and Windows, and Cypress on Linux, for every PR. |
| `.github/workflows/deploy.yml` | Deploys `main` to GitHub Pages. |
| `.github/dependabot.yml` | Weekly dependency update PRs. |
| `.github/rulesets/main.json` | Branch rules for `main` (import it, see below). |
| `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `LICENSE`, `LICENSE-CONTENT.md` | Shown by GitHub in the repository sidebar and the "Community standards" checklist. |

## One-time settings

### 1. Protect `main` (pull requests required)

*Settings → Rules → Rulesets → New ruleset → **Import a ruleset*** and pick `.github/rulesets/main.json`. It:

- blocks direct pushes, force pushes and deleting `main`: every change arrives through a pull request;
- requires one approving review from a code owner, re-requested when new commits are pushed, and all review threads resolved;
- requires CI to pass: unit tests and build on Linux, macOS and Windows, plus Cypress;
- allows **squash merge** only, so `main` keeps one commit per pull request;
- lets repository admins bypass the review **inside a pull request** (needed while there is a single maintainer, because GitHub does not let you approve your own PR). Admins still cannot push straight to `main`.

The status checks only appear after CI has run once. If GitHub warns that a check was not found, push a branch, open a PR, and the warning goes away.

From a terminal instead (needs the [GitHub CLI](https://cli.github.com/)):

```bash
gh api -X POST repos/ArielGS/e-115-archive/rulesets --input .github/rulesets/main.json
```

### 2. General

*Settings → General*:

- **Features**: Issues ✔. Discussions optional.
- **Pull Requests**: allow squash merging only; ✔ *Always suggest updating pull request branches*; ✔ *Automatically delete head branches*.

### 3. Security

*Settings → Code security*:

- ✔ **Private vulnerability reporting** (the channel `SECURITY.md` points to).
- ✔ **Dependabot alerts** and **Dependabot security updates**.

### 4. Moderation

*Settings → Moderation options → Reported content*: allow reports from **all users**. That is the private reporting channel `CODE_OF_CONDUCT.md` describes.

### 5. Labels

The issue templates apply these labels; create the ones that do not exist (*Issues → Labels*): `bug`, `content`, `enhancement`, `map guide`, `triage`. Also add `good first issue` and `help wanted` to point new contributors to easy tasks (GitHub lists them on the repository's Contribute page).

### 6. Actions for outside contributors

*Settings → Actions → General → Fork pull request workflows*: keep *Require approval for first-time contributors*. CI runs with read-only permissions, so it cannot publish anything from a fork.

### 7. Vercel (production site)

Production lives at **https://e-115-archive.vercel.app**.

1. At [vercel.com/new](https://vercel.com/new), import the GitHub repository.
2. Set **Project Name** to `e-115-archive`. Vercel builds the `*.vercel.app` address from it; if the name is taken you get a suffixed address instead, so check before deploying.
3. Leave every other setting as detected: `vercel.json` already sets the install, build (unit tests + Astro) and output folder. No environment variables are needed: the site URL used in canonical and `hreflang` links comes from `VERCEL_PROJECT_PRODUCTION_URL`, and the "edit this page" links from the connected GitHub repository (`src/lib/hosting.mjs`).
4. Every push to `main` deploys to production; every pull request gets a preview URL.

## Check

*Insights → Community standards* should show every item ticked.
