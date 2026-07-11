# Contributing

Thanks for helping out with the Midcoast Solidarity site. This is a static HTML and CSS site with no build step and no shipped JavaScript. The `npm` setup below exists only for local dev tooling (formatting, linting, accessibility checks); none of it reaches the deployed site.

## Development

No build step required. To develop:

1. Open `index.html` in a browser
2. Edit files in your favorite IDE and refresh

For live reloading, use any simple HTTP server:

```bash
python -m http.server 8000
# or
npx serve
# or use your favorite live preview/server IDE extension
```

## Local dev tooling

This project uses `npm` only for tooling (no runtime JS shipped). Run this once to install dev deps:

```bash
npm ci
```

npm 12 and later block dependency install scripts unless they are allow-listed. `package.json` carries an `allowScripts` approval for puppeteer's postinstall (the browser download pa11y needs), pinned to the current version. After a puppeteer version bump, re-approve it with `npm install-scripts approve puppeteer`.

If you use a Node version manager like `nvm` or `fnm`, we support automatic Node runtime switching with our `.nvmrc` file:

```bash
nvm use
# or
fnm use
```

### Key npm scripts (run with `npm run <name>`)

- `format`: formats HTML with Prettier
- `format:check`: checks formatting (used in CI)
- `lint:css`: runs Stylelint against HTML using postcss-html
- `lint:html`: runs Markuplint on HTML
- `test:a11y`: runs pa11y-ci accessibility tests
- `prepare`: installs Husky hooks (run automatically after `npm ci`)

### Pre-commit and staged checks

- Husky installs Git hooks (via the `npm run prepare` script)
- The `.husky/pre-commit` hook runs `lint-staged` and then `pa11y-ci`
- `lint-staged` runs automatic fixes/linters on staged `*.html` files:
  - Prettier (check, `config/prettier.config.json`)
  - Stylelint (fix with `postcss-html`, `config/stylelint.config.json`)
  - Markuplint (`config/markuplint.config.json`)
- `pa11y-ci` reads `config/pa11y.config.json` and runs accessibility checks against the listed files
- Run staged checks locally the same way as CI by committing changes (Husky will trigger) or run the linters directly with the scripts above
  - You may need to `chmod +x .husky/pre-commit` to make it executable

### Continuous integration

The GitHub Actions workflow (`ci.yml`) sources its Node version from `.nvmrc` and runs three jobs in parallel, each surfacing as its own check:

- **Quality**: `npm ci`, then `format:check`, `lint:css`, `lint:html`, and a `yamllint` pass over `.github` using `config/yamllint.yml`
- **Accessibility**: `npm ci`, then `test:a11y` (pa11y-ci)
- **Security**: Gitleaks (secret scanning over history), Trivy (filesystem vuln/misconfig/secret scan), OSV-Scanner (dependency SCA on `package-lock.json`), `npm audit` (informational), and `dependency-review` (pull requests only)

Dependency and GitHub Actions updates arrive as weekly Dependabot PRs (see `.github/dependabot.yml`). Merge them once CI is green.

### Quick developer checklist

1. `npm ci`
2. Edit `*.html`
3. `npm run format`
4. `npm run lint:css && npm run lint:html`
5. `git add, commit` (`lint-staged` + `pa11y-ci` will run on commit)
6. Push / open PR (CI will run the same checks)

## Commit messages and pull requests

### Commit subjects

Write subjects as `type: short summary`, matching the existing history:

```
info: July 2026 website updates
deps: bump toolchain and clear undici/js-yaml advisories
docs: split contributor guide out of README into CONTRIBUTING.md
ci: bump actions/checkout from 6.0.3 to 7.0.0
```

- Types in use: `info` (site content and copy), `docs` (README, CONTRIBUTING, other docs), `deps` (dev dependencies and lockfile), `ci` (workflows and actions). Dependabot is configured to use `deps` and `ci` (see `.github/dependabot.yml`), so keep those meanings stable. Add a new type sparingly when a change fits none of these (for example `fix` for site layout or behavior bugs).
- Keep the summary imperative and concrete ("bump X", "split Y", "update Z"), lowercase the type, skip the trailing period, and stay under about 70 characters.
- Name branches `type/short-slug` after the type the squashed commit will carry (for example `info/refactor-navbar`).
- PRs are squash-merged, so the PR title becomes the commit subject on `main` (GitHub appends the `(#N)` reference). Write PR titles in the same `type: summary` form.

### Commit bodies

A subject alone is fine for a small self-explanatory change. When a body helps, spend it on why, not a replay of the diff:

- Separate the subject from the body with a blank line and wrap body lines at about 72 characters.
- Bullet related changes with `-`, and write version bumps as `old -> new` (for example `prettier 3.8.3 -> 3.9.4`).
- Name what a future reader will search for: advisory IDs (`GHSA-...`), PR numbers, config file paths.

### PR descriptions

Follow `.github/PULL_REQUEST_TEMPLATE.md` (What and why, Changes, Verification, Notes for reviewers). Keep it short and delete sections that do not apply.

- **What and why** is a sentence or two of motivation. The diff already shows the what, so spend the words on the why.
- **Verification** says what you actually ran or looked at: linters, `test:a11y`, which pages you opened in a browser and at what widths. CI running on the PR is a given, not a verification.
- **Notes for reviewers** flags follow-ups, uncertainty, and anything expected to be red (for example a base-branch advisory) so nobody is surprised.

When in doubt, read a few merged PRs and match them.

## Repository layout notes

The four linter configs live in `config/` so the root stays uncluttered. Each tool is pointed at its file with an explicit `--config` flag in the npm scripts. `.nvmrc` stays at the root because `nvm use` / `fnm use` only read it from the current directory, and `package.json` / `package-lock.json` stay at the root so `npm ci` and `npm run` work without a `--prefix`.

## Conventions

### Image files

All images are contained within the `images` folder and must be invoked in `index.html` with alt text. Images of book covers for the Bookclub section of the website are specifically stored in the subfolder `images/books`.

### Custom CSS

Responsive no-JS styles for the site:

- Fixed card sizes give consistent rows but may need adjustments for very small screens or unusual cover ratios
- Relies on modern CSS (sticky, `vh`/`vw`); widely supported in current browsers

#### Usage

- Add to the `<style>` tag. Designed to work with semantic HTML:
  - header (with `.navbar`)
  - landing
  - `.main` containing `.row`/`.column`
  - a `.bookshelf `of `.box` cards (with .`cover`/`.title`/`.author`)
  - footer
