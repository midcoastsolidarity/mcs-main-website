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
- `lint:prose`: checks page copy and docs against the [house style](#house-style) (`config/check-prose.mjs`)
- `test:a11y`: runs pa11y-ci accessibility tests
- `prepare`: installs Husky hooks (run automatically after `npm ci`)

### Pre-commit and staged checks

- Husky installs Git hooks (via the `npm run prepare` script)
- The `.husky/pre-commit` hook runs `lint-staged` and then `pa11y-ci`
- The `.husky/commit-msg` hook checks the commit message against the [house style](#house-style)
- `lint-staged` runs automatic fixes/linters on staged `*.html` files:
  - Prettier (check, `config/prettier.config.json`)
  - Stylelint (fix with `postcss-html`, `config/stylelint.config.json`)
  - Markuplint (`config/markuplint.config.json`)
- `pa11y-ci` reads `config/pa11y.config.json` and runs accessibility checks against the listed files
- Run staged checks locally the same way as CI by committing changes (Husky will trigger) or run the linters directly with the scripts above
  - You may need to `chmod +x .husky/pre-commit` to make it executable

### Continuous integration

The GitHub Actions workflow (`ci.yml`) sources its Node version from `.nvmrc` and runs three jobs in parallel, each surfacing as its own check:

- **Quality**: `npm ci`, then `format:check`, `lint:css`, `lint:html`, `lint:prose`, and a `yamllint` pass over `.github` using `config/yamllint.yml`
- **Accessibility**: `npm ci`, then `test:a11y` (pa11y-ci)
- **Security**: Gitleaks (secret scanning over history), Trivy (filesystem vuln/misconfig/secret scan), OSV-Scanner (dependency SCA on `package-lock.json`), `npm audit` (informational), and `dependency-review` (pull requests only)

Dependency and GitHub Actions updates arrive as weekly Dependabot PRs (see `.github/dependabot.yml`). Merge them once CI is green. When CI is not green, or when several are open at once, work through [Dependency maintenance](#dependency-maintenance) below.

### Quick developer checklist

1. `npm ci`
2. Edit `*.html`
3. `npm run format`
4. `npm run lint:css && npm run lint:html && npm run lint:prose`
5. `git add, commit` (`lint-staged` + `pa11y-ci` will run on commit)
6. Push / open PR (CI will run the same checks)

## Dependency maintenance

Dependabot opens PRs on the schedule in `.github/dependabot.yml`. Plenty of them are a single lockfile bump that you can merge as soon as CI is green. This section is about the rest, and about what to do when the Security job goes red.

### Why a single Dependabot PR often cannot go green

OSV-Scanner reads the whole of `package-lock.json`, not the diff. If `main` has advisories in four packages and a PR fixes one of them, the Security job still fails on the other three, and the PR sits there looking broken when it is not.

Merging them one at a time does not help either. Each merge rewrites the lockfile, which makes every other open PR stale, so each one needs a rebase and another CI cycle, and `main` stays red the whole way through.

So: one open Dependabot PR, merge it. More than one, or a red Security job on `main`, do a single consolidated pass instead.

### Consolidating Dependabot PRs

**1. Find out what is open and what is actually failing.**

```bash
gh pr list --state open
gh pr checks <PR>
gh run view <run-id> --log-failed | grep osv.dev
```

That last one prints OSV-Scanner's table: package, current version, and the version that fixes it. Work from that list rather than from the PR titles, because it usually includes advisories Dependabot has not filed a PR for yet.

**2. Branch from an up to date `main`.**

```bash
git switch main && git pull
git switch -c deps/dependency-refresh
```

**3. Edit the range in `package.json` for direct dependencies.**

Anything under `devDependencies` is direct. Change the range by hand, matching what the Dependabot PR proposed (`"postcss-html": "^2.0.0"`). Editing only the lockfile does not stick: the next `npm install` resolves against `package.json` and undoes it.

**4. Let npm move the transitive ones.**

```bash
npm install      # re-resolves the ranges you just edited
npm audit fix    # moves transitive packages that have advisories
```

Leave `package.json` alone for these. Nothing under `devDependencies` depends on `brace-expansion` directly; it arrives through something else, and `npm audit fix` is the supported way to move it.

**5. Confirm you got what you came for.**

```bash
npm audit                          # want: found 0 vulnerabilities
npm ls postcss undici --all        # spot-check specific versions
```

**6. Check the blast radius.**

`npm install` can drag along more than you asked for, and a lockfile diff is far too noisy to read. Diff the resolved versions instead:

```bash
git show main:package-lock.json > /tmp/old-lock.json
python3 - <<'EOF'
import json
old = json.load(open('/tmp/old-lock.json'))['packages']
new = json.load(open('package-lock.json'))['packages']
for k in sorted(set(old) | set(new)):
    a = old.get(k, {}).get('version')
    b = new.get(k, {}).get('version')
    if a != b:
        print(f"{k.replace('node_modules/', '') or '(root)'}: {a} -> {b}")
EOF
```

Every line should be something you intended, something an intended bump pulled with it, or something a bump dropped. If the list runs to dozens of packages you did not expect, you probably want `git checkout main -- package-lock.json` and a more targeted second attempt.

**7. Run CI locally** (see below), then commit, push, and open a PR.

List the PRs you are superseding in the description. You do not need to close them: Dependabot closes its own PR once it sees the dependency on `main` at or above the version it wanted.

### Running CI locally

The workflow runs Quality, Accessibility and Security in parallel. Reproducing Quality and Accessibility takes a few commands:

```bash
npm ci                                      # not npm install: installs strictly from the lockfile
npm run format:check
npm run lint:css
npm run lint:html
npm run lint:prose
yamllint -c config/yamllint.yml .github     # pipx install yamllint
npm run test:a11y
```

pa11y drives Chrome through puppeteer. If `test:a11y` cannot find a browser, install it the same way CI does:

```bash
rm -rf ~/.cache/puppeteer
npx puppeteer browsers install chrome
```

For Security, `npm audit` covers the same ground as OSV-Scanner closely enough for dependency work. Gitleaks and Trivy almost never fire on a dependency change. `dependency-review` only runs on pull requests, because it needs a base to diff against.

**`lint:css` and `lint:html` rewrite your HTML.** Both npm scripts pass `--fix`. Run `git status` after them.

There is a live disagreement between Markuplint and Prettier about where a closing tag goes. Prettier writes `</a\n>` and `npm run lint:html` rewrites it to `</a>`, so Markuplint reformats HTML that `format:check` considers correct. CI does not notice, because `format:check` runs earlier in the job and the runner is thrown away before anything is saved. Locally the edit is real and it will follow you into a commit. Unless you meant to touch the markup:

```bash
git checkout -- '*.html'
```

### Major version bumps

A major deserves two extra minutes. Check what it now demands:

```bash
npm view <package>@<version> engines peerDependencies
```

Compare `engines` against `.nvmrc`. A dependency that has become a peer dependency has to be satisfiable from the existing tree, or npm will pull in a second copy.

Then confirm the tool still does its job, rather than passing because it quietly stopped working. A linter that no longer parses anything passes every check you have. When `postcss-html` moved to 2.0.0, the check was to break the CSS on purpose:

```html
<style>
  .canary { colr: red; }
</style>
```

```bash
npx stylelint --config config/stylelint.config.json --custom-syntax postcss-html "**/*.html"
```

Expect `Unknown property "colr"`. If it passes, the custom syntax is no longer reaching the embedded CSS. Revert the canary either way.

### Lockfile conflicts

Do not hand-merge a conflicted `package-lock.json`. Resolve `package.json` by hand, since that conflict is small and readable, then throw the lockfile away and rebuild it:

```bash
git checkout main -- package-lock.json
npm install
git add package-lock.json
```

The result is a lockfile that actually matches `package.json`, which is more than a hand-merged one can promise.

### When CI is red

First work out whether it is you.

**Red before you touched it.** Check `main` and compare:

```bash
gh run list --branch main --limit 5
```

An older Dependabot PR branches from an older `main` and inherits whatever was broken then. Rebasing fixes it, and Dependabot will do that for you: comment `@dependabot rebase` on the PR.

**Security red, everything else green.** Nearly always a tree-wide advisory rather than something the PR introduced. Read the OSV table in the log and consolidate as above.

**Cancelled with no steps.** Not your code. A job that never got a runner reports an empty runner name and no steps at all:

```bash
gh api repos/<owner>/<repo>/actions/runs/<run-id>/jobs \
  --jq '.jobs[] | {name, conclusion, runner: .runner_name, steps: (.steps | length)}'
```

Check <https://www.githubstatus.com> before doing anything else. During an Actions incident, runs are slow to be created, sit queued, and get cancelled after about fifteen minutes without ever starting. Wait it out, then `gh run rerun <run-id>`.

**Anything else**, read the failure:

```bash
gh run view <run-id> --log-failed
```

### Dependabot comment commands

Comment these on a Dependabot PR:

- `@dependabot rebase` rebases it on current `main`
- `@dependabot recreate` rebuilds it from scratch and discards any edits you pushed to the branch
- `@dependabot merge` merges once CI passes
- `@dependabot close` closes it and stops it coming back until the next release

### In the GitHub web UI

- **The PR description** carries the upstream release notes and commit list. Read them before trusting a major.
- **Merge button greyed out.** The merge box lists the required checks and whether the branch is behind `main`. Where `main` is protected, a strict status check policy means you need "Update branch" before the merge button lights up, and the checks then re-run against the merged result.
- **Security tab, Dependabot alerts.** Same advisories OSV-Scanner reports, with the dependency path that pulled each one in. Useful for working out which direct dependency to bump to shift a transitive one.
- **Actions tab.** Re-run individual failed jobs without pushing an empty commit.

### Account and signing key

The two sites use separate GitHub accounts and separate signing keys. `gh` acts as whichever account is active, so creating a PR against the other site fails with `must be a collaborator`:

```bash
gh auth status
gh auth switch --user <account>
```

Commits are signed. If one fails with `incorrect passphrase supplied to decrypt private key`, the signing key is not loaded in your SSH agent. Add it (`ssh-add <path-to-key>`) and commit again.

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

- Separate the subject from the body with a blank line.
- Write each paragraph as one line. Do not hard wrap. Every viewer that shows a commit body wraps it for you, at whatever width the reader actually has, and a body wrapped at a fixed column reflows badly in all of them. `commit-msg` rejects a body that looks hard wrapped.
- Bullet related changes with `-`, and write version bumps as `old -> new` (for example `prettier 3.8.3 -> 3.9.4`).
- Name what a future reader will search for: advisory IDs (`GHSA-...`), PR numbers, config file paths.

### PR descriptions

Follow `.github/PULL_REQUEST_TEMPLATE.md` (What and why, Changes, Verification, Notes for reviewers). Keep it short and delete sections that do not apply.

- **What and why** is a sentence or two of motivation. The diff already shows the what, so spend the words on the why.
- **Verification** says what you actually ran or looked at: linters, `test:a11y`, which pages you opened in a browser and at what widths. CI running on the PR is a given, not a verification.
- **Notes for reviewers** flags follow-ups, uncertainty, and anything expected to be red (for example a base-branch advisory) so nobody is surprised.

When in doubt, read a few merged PRs and match them.

Write the description before you open the PR, and get it right the first time. GitHub keeps a public revision history for every edited PR body, and there is no way to remove it short of deleting the repository. If a description needs a real rewrite, close the PR and open a new one.

## House style

These rules cover the page copy, the docs, and commit messages. `npm run lint:prose` checks the first two and the `commit-msg` hook checks the third, both through `config/check-prose.mjs`.

- **No em dashes and no en dashes.** Use a comma, a colon, or a full stop. A plain hyphen is right for a range (`1-10`), and "to" is right for a date range in a sentence.
- **No emoji.** In page copy they rarely survive a screen reader in the order you expect, and they date a page fast.
- **One term per concept.** Repeat the term rather than reaching for a synonym. A reader skimming for the word they were told to look for should find that word.
- **Short sentences, active voice, named subject.** Say who does the thing.
- **One blank line** between paragraphs in Markdown, never two.

Do not name a drafting tool in a commit message or a PR description, and do not add a `Co-authored-by` trailer for one. Describe the change. Who or what typed it is not what a future reader is looking for, and `commit-msg` rejects a trailer that names anything other than this repository's own account.

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
