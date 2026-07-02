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
