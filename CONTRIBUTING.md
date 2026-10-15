# Contributing

Thanks for wanting to help with the Midcoast Solidarity site! It's plain HTML and CSS, without a build step, and the site doesn't ship any JavaScript. npm is here only for local checks (formatting, linting, and accessibility), and none of it reaches the live site.

## Quick start

You need the Node version in `.nvmrc` (`nvm use` or `fnm use` picks it up).

```bash
npm ci                       # installs the dev tools and the Git hooks
python -m http.server 8000   # or npx serve, or just open index.html in a browser
```

Edit the `.html` and `.css` files and refresh. Before you commit, run these:

```bash
npm run fix           # applies every automatic fix
npm run lint:prose    # checks page copy and docs for house style
npm run lint:shared   # checks that every page has the same header and footer
```

Then commit as usual. The hooks run the format, lint, and accessibility checks on your staged pages, and CI runs the full set on your PR. Push your branch and open a PR.

## Making a change

This part covers naming, the hooks, PRs, and CI, in the order you'll run into them.

### Branches and commits

Name your branch `type/short-slug` and write commit subjects as `type: short summary`. Some real examples:

```text
info: July 2026 website updates
deps: bump toolchain and clear undici/js-yaml advisories
docs: split contributor guide out of README into CONTRIBUTING.md
ci: bump actions/checkout from 6.0.3 to 7.0.0
```

| Type | Use it for | PR label |
|---|---|---|
| `info` | site content and copy | `information` |
| `docs` | README, CONTRIBUTING, and other docs | `documentation` |
| `deps` | dev dependencies and the lockfile | `dependencies` and `javascript` |
| `ci` | workflows and actions | |
| `sec` | security hardening and security fixes | `security` |
| `fix` | layout or behavior bugs on the site | `bug` |

Dependabot uses `deps` and `ci` (see `.github/dependabot.yml`), so keep those two meaning what they mean now. Only add a new type when nothing above fits.

Keep the summary short and imperative ("bump X", "split Y", "update Z"). Use a lowercase type, skip the trailing period, and stay under about 70 characters.

A subject on its own is fine for a small change. If a body would help, use it to explain why, since the diff already shows what. Leave a blank line after the subject. Write each paragraph on one line, because GitHub rewraps it to fit the window and the `commit-msg` hook rejects a hard wrapped body. Use `-` for bullets and write version bumps as `old -> new` (like `prettier 3.8.3 -> 3.9.4`). Name the things people will search for later, like advisory IDs (`GHSA-...`), PR numbers, and config paths.

Commits are signed. If one fails with `incorrect passphrase supplied to decrypt private key`, your signing key isn't loaded in the SSH agent. Add it with `ssh-add <path-to-key>` and commit again.

### What the hooks run

`npm ci` installs the Husky hooks through the `prepare` script.

- `pre-commit` runs `lint-staged` on staged `*.html` and `*.css` files (Prettier in check mode, Stylelint, and Markuplint for the HTML). Then it runs `config/check-shared.mjs`, and `pa11y-ci` on every page in `config/pa11y.config.json` with the Chrome sandbox on.
- `commit-msg` runs the [house style](#house-style) checks on your commit message.

None of them change your files. If a hook doesn't run at all, try `chmod +x .husky/pre-commit .husky/commit-msg`.

### Opening a PR

PRs get squash-merged, so the PR title becomes the commit subject on `main` (GitHub adds the `(#N)`). Use the same `type: summary` form for the title, and add the label from the table above.

Fill in `.github/PULL_REQUEST_TEMPLATE.md` and delete any section that doesn't apply. Keep "What and why" to a sentence or two about why. Under "Verification", say what you actually ran or looked at, like the linters, `test:a11y`, and which pages you opened at which widths. CI running on the PR doesn't count. Use "Notes for reviewers" for follow-ups, doubts, and anything you expect to be red, like an advisory already on `main`.

Write the description before you open the PR. GitHub keeps a public history of every edit to a PR body, and only deleting the repo clears it. If a description needs a real rewrite, open a new PR instead.

### CI

`ci.yml` reads the Node version from `.nvmrc` and runs these jobs in parallel, each as its own check:

- Format & Lint runs `npm ci`, then `format:check`, `lint:css`, `lint:html`, `lint:prose`, `lint:shared`, and `yamllint` over `.github` with `config/yamllint.yml`.
- Accessibility runs `npm ci`, then `pa11y-ci` with `config/pa11y.ci.config.cjs` (see [the accessibility check](#the-accessibility-check)).
- Security runs Gitleaks over the whole history and a Trivy filesystem scan for vulnerabilities, misconfigs, and secrets. It also runs OSV-Scanner on `package-lock.json`, `npm audit` (informational only), and `dependency-review` on PRs.

A PR has to be up to date with `main` before it can merge. After every merge, the next PR needs "Update branch" (or `gh pr update-branch <number>`) and a fresh green run.

## House style

Most of this is about being readable for somebody who isn't already in the room with us. People reach the site on old phones, on slow connections, and with screen readers. Plenty of them are deciding whether we're worth showing up for.

So write short sentences, and say who's doing the thing. Pick the plain word. Once a term matters, keep using it instead of switching to a synonym, so someone skimming for that word can find it.

Keep the punctuation boring. Commas, colons, and full stops do nearly everything, and a plain hyphen works for a range. Skip the fancy dashes and decorative characters. Screen readers read them aloud in odd ways, and they break badly when a line wraps on a narrow screen. Half our contributors have to hunt for them on the keyboard anyway. Emoji have the same problems and date a page fast. In Markdown, leave one blank line between paragraphs.

`npm run lint:prose` checks page copy and docs. The `commit-msg` hook checks commit messages. Both use `config/check-prose.mjs`. If either one flags a character, swapping in a comma or a full stop almost always fixes it.

A commit message describes the change, not how it got written. Only add a `Co-authored-by` trailer for someone who actually worked on the change here. The hook rejects any other co-author, which mostly stops a stray trailer from another machine's git config from landing in the history.

## Reference

The rest is detail to look up when you need it.

### npm scripts

Run these with `npm run <name>`. Only `fix`, `format`, and the two `:fix` scripts write to your files. The rest just report and exit, the way a check should.

| Script | What it does |
|---|---|
| `fix` | applies every automatic fix, in the order that leaves the tree ready to commit |
| `format` | formats the HTML and CSS with Prettier |
| `format:check` | checks formatting |
| `lint:css` | lints `css/style.css` and the CSS inside the HTML with Stylelint (`postcss-html` reads the HTML) |
| `lint:css:fix` | the same, applying Stylelint's fixes |
| `lint:html` | lints the HTML with Markuplint |
| `lint:html:fix` | the same, applying Markuplint's fixes |
| `lint:prose` | runs the [house style](#house-style) checks on page copy and docs |
| `lint:shared` | checks that every page's header and footer match `index.html` (see [page conventions](#page-conventions)) |
| `test:a11y` | runs the pa11y-ci accessibility tests |
| `prepare` | installs the Husky hooks (`npm ci` runs it for you) |

Use `fix` instead of running the `:fix` scripts one by one. Prettier and Markuplint disagree about closing tags: Prettier writes `</a\n>`, `markuplint --fix` pulls it back onto one line, and then `format:check` fails. Prettier gets the last word, since the hook and CI both gate on `prettier --check`. So `fix` runs the linters first and Prettier last. If it stops on a lint error, fix the markup by hand and run it again.

npm 12 and later block dependency install scripts unless they're allow-listed. `package.json` approves puppeteer's postinstall (the browser download pa11y needs), pinned to the current puppeteer version. After a puppeteer bump, approve it again with `npm install-scripts approve puppeteer`.

### Running CI locally

The Format & Lint and Accessibility jobs come down to these commands:

```bash
npm ci                                      # not npm install: this installs strictly from the lockfile
npm run format:check
npm run lint:css
npm run lint:html
npm run lint:prose
npm run lint:shared
yamllint -c config/yamllint.yml .github     # pipx install the yamllint version ci.yml pins
npm run test:a11y
```

If `test:a11y` can't find a browser, install one the way CI does:

```bash
rm -rf ~/.cache/puppeteer
npx puppeteer browsers install chrome
```

For Security, `npm audit` is close enough to OSV-Scanner for dependency work. Gitleaks and Trivy almost never fire on a dependency change. `dependency-review` only runs on PRs, because it needs a base to compare with.

### The accessibility check

`pa11y-ci` opens each page in headless Chrome (through puppeteer) and tests it for WCAG 2 AA with HTML_CodeSniffer. The pages come from the `urls` list in `config/pa11y.config.json`, so a new page doesn't get tested until you add it there. A single issue on any page fails the run. CI uses `config/pa11y.ci.config.cjs`, which is the local config plus the Chrome sandbox bypass the runner needs.

Always run it as `npm run test:a11y`. The config isn't at pa11y's default path, so a bare `npx pa11y-ci` tests 0 URLs and passes.

A clean run prints `Running Pa11y on N URLs:`, then a `- 0 errors` line for each page, then `N/N URLs passed`. A failing page gets an `Errors in file://...` block. Each error shows the rule, the element's selector (like `html > body > main > p`), and its HTML, and the selector tells you where to look.

#### Real problem or broken upgrade?

Look at where the log stops, then compare with `main`.

| What you see | What it means | What to do |
|---|---|---|
| `Errors in file://...` blocks, and the PR changed a page | A real regression | Fix the page |
| The job dies before `Running Pa11y on N URLs` (`Could not find Chrome`, `Cannot find module`, an unsupported engine, a config error) | A broken upgrade | Check the Chrome pin below, then the release notes |
| `Errors in` blocks on pages that a dependency-only PR never touched | A newer ruleset caught something the old one missed | Run `main` to confirm, then fix the page. Only suppress a rule in `config/pa11y.config.json` for a proven false positive, and give the reason in the PR |
| `Running Pa11y on 0 URLs` | The wrong config path | Run it through `npm run test:a11y` |

`main` settles it. Run `git switch main && npm ci && npm run test:a11y`. If `main` is green but a PR that didn't touch any page is red, the upgrade broke it. If `main` is red too, it isn't the PR's fault (see [When CI is red](#when-ci-is-red)).

For a broken upgrade, see what moved with `npm ls pa11y puppeteer` and `git diff main -- package.json`. Then read the release notes (`gh release view <tag> -R pa11y/pa11y-ci`, and the same for `pa11y/pa11y`) and run `npm view pa11y-ci@<version> dependencies engines`. Make sure `engines` still allows the version in `.nvmrc`.

#### The Chrome pin

`ci.yml` installs a pinned browser with `npx puppeteer browsers install chrome@<build>`. That build has to be the one the locked puppeteer expects, or the next step fails with `Could not find Chrome (ver. <build>)`. A pa11y-ci bump can raise puppeteer inside its allowed range. Then the lockfile changes and the pin goes stale, even though nobody touched `ci.yml`.

To find the right build, run this on the PR branch and copy the `chrome@<build>` it prints into `ci.yml`:

```bash
PUPPETEER_CACHE_DIR=$(mktemp -d) npx puppeteer browsers install chrome
```

Approve the new puppeteer's install script too (see [npm scripts](#npm-scripts)), and push both changes to the Dependabot branch. Dependabot stops rebasing a branch once someone else has edited it. So merge it when CI is green, or comment `@dependabot recreate` to start over.

#### Make sure it can still fail

After a pa11y-ci or puppeteer bump, break a page on purpose and check that the test goes red. Add this inside `<main>` in `index.html`:

```html
<img src="images/favicon.webp"><p style="color:#bbb;background:#fff">canary</p>
```

`npm run test:a11y` should report `Img element missing an alt attribute` and a contrast error, and exit non-zero. If it passes, the tool has stopped testing anything. Remove the canary either way. To see it fail in CI as well, push it to a scratch branch and start the workflow by hand from the Actions tab. Delete the branch after.

### Dependencies

Dependabot opens weekly PRs for npm packages and GitHub Actions (`.github/dependabot.yml`). Lots of them are a single lockfile bump, and you can merge those once CI is green. The rest of this section is for the ones that won't go green, and for a red Security job.

#### Why a Dependabot PR often can't go green

OSV-Scanner reads all of `package-lock.json`, not just the diff. Say `main` has advisories in four packages and a PR fixes one. Security still fails on the other three, so the PR looks broken when it isn't.

Merging them one at a time doesn't help either. Each merge rewrites the lockfile and leaves every other open PR stale. They all need a rebase and another CI run, and `main` stays red the whole time.

So if there's one open Dependabot PR, merge it. If there are several, or Security is red on `main`, do one combined pass instead.

#### Combining Dependabot PRs

1. See what's open and what's actually failing:

   ```bash
   gh pr list --state open
   gh pr checks <PR>
   gh run view <run-id> --log-failed | grep osv.dev
   ```

   The last command prints OSV-Scanner's table: each package, its current version, and the version that fixes it. Work from that list instead of the PR titles, because it usually includes advisories Dependabot hasn't opened a PR for yet.

2. Branch from an up-to-date `main`:

   ```bash
   git switch main && git pull
   git switch -c deps/dependency-refresh
   ```

3. For direct dependencies (everything under `devDependencies`), edit the range in `package.json` by hand to match the Dependabot PR, like `"postcss-html": "^2.0.0"`. Changing only the lockfile won't stick, because the next `npm install` resolves from `package.json` and undoes it.

4. Let npm move the transitive dependencies, and leave `package.json` alone for those:

   ```bash
   npm install      # re-resolves the ranges you just edited
   npm audit fix    # moves transitive packages that have advisories
   ```

   For example, nothing under `devDependencies` depends on `brace-expansion` directly. It comes in through another package, and `npm audit fix` is the supported way to move it.

5. Check that you got what you wanted:

   ```bash
   npm audit                          # want: found 0 vulnerabilities
   npm ls postcss undici --all        # spot-check specific versions
   ```

6. Check what else moved. `npm install` can drag in more than you asked for, and a lockfile diff is too noisy to read. Compare the resolved versions instead:

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

   Every line should be a bump you meant, something it pulled in with it, or something it dropped. If dozens of packages moved that you didn't expect, run `git checkout main -- package-lock.json` and try a narrower change.

7. [Run the checks locally](#running-ci-locally), then commit, push, and open a PR. List the PRs it replaces in the description. You don't need to close them, since Dependabot closes its own PR once `main` has the version it wanted or newer.

#### Major versions

Give a major bump a couple of extra minutes. Check what it needs now:

```bash
npm view <package>@<version> engines peerDependencies
```

Compare `engines` with `.nvmrc`. If a dependency became a peer dependency, the existing tree has to satisfy it, or npm pulls in a second copy.

Then make sure the tool still does its job and isn't passing because it quietly stopped working. A linter that can't parse anything passes every check. When `postcss-html` went to 2.0.0, the test was to break the CSS on purpose:

```html
<style>
  .canary { colr: red; }
</style>
```

```bash
npm run lint:css
```

You should see `Unknown property "colr"`. If it passes, `postcss-html` isn't reaching the embedded CSS anymore. Remove the canary either way.

#### Lockfile conflicts

Don't hand-merge a conflicted `package-lock.json`. Fix `package.json` by hand (that conflict is small and readable), then throw the lockfile away and rebuild it so it matches:

```bash
git checkout main -- package-lock.json
npm install
git add package-lock.json
```

#### When CI is red

First work out whether it's you. If it was red before your change, compare with `main`:

```bash
gh run list --branch main --limit 5
```

An older Dependabot PR branched from an older `main` and inherits whatever was broken then. Comment `@dependabot rebase` and Dependabot rebases it for you.

If only Security is red, it's nearly always an advisory across the whole tree, and the PR didn't add it. Read the OSV table in the log and do a [combined pass](#combining-dependabot-prs).

A job that got canceled before any step ran isn't your code. A job that never got a runner shows an empty runner name and zero steps:

```bash
gh api repos/<owner>/<repo>/actions/runs/<run-id>/jobs \
  --jq '.jobs[] | {name, conclusion, runner: .runner_name, steps: (.steps | length)}'
```

In that case check <https://www.githubstatus.com> first. During an Actions incident, runs are slow to start, sit in the queue, and get canceled after about fifteen minutes without ever starting. Wait it out, then `gh run rerun <run-id>`.

For anything else, read the failure with `gh run view <run-id> --log-failed`.

#### Dependabot commands

Comment these on a Dependabot PR:

- `@dependabot rebase` rebases it on the current `main`
- `@dependabot recreate` rebuilds it from scratch and throws away any edits pushed to the branch
- `@dependabot merge` merges it once CI passes
- `@dependabot close` closes it and keeps it from coming back until the next release

#### On github.com

- A Dependabot PR's description has the upstream release notes and commit list. Read them before you trust a major.
- If the merge button is greyed out, the merge box lists the required checks and whether the branch is behind `main`.
- Under the Security tab, Dependabot alerts show the same advisories as OSV-Scanner, plus the dependency path that pulled each one in. That helps you find which direct dependency to bump to move a transitive one.
- In the Actions tab you can re-run a single failed job without pushing an empty commit.

### Crawlers and AI

`robots.txt` opts the site out of AI training and AI crawling. It uses the `Content-Usage` rule from the IETF AI Preferences drafts (`draft-ietf-aipref-vocab-08` and `draft-ietf-aipref-attach-05`). The `*` group stays open, and the AI crawlers share a group that ends in `Disallow: /`.

To add a crawler, check its token in the vendor's own docs, then add a `User-agent:` line to that group. Crawlers don't have to honor `robots.txt`, so the file is only a request.

GitHub Pages can't set HTTP response headers, so the `Content-Usage` header from the drafts isn't an option. Instead every page has a `<meta name="robots" content="noarchive">` tag, and new pages need it too. Amazonbot reads it as "don't use this page for model training". Bing reads it as "keep this page out of Bing Chat answers and model training". The drafts don't define a meta tag. If the site ever moves to a host that can set headers, send `Content-Usage: train-ai=n, ai-use=n` there.

### Repo layout

The tool configs live in `config/`, and each npm script points at its file with an explicit `--config` flag. A few files have to stay at the root:

- `.nvmrc`, because `nvm use` and `fnm use` only read it from the current directory
- `package.json` and `package-lock.json`, so `npm ci` and `npm run` work without `--prefix`
- `cspell.json`, because the spell checker searches upward from the file it checks (a copy under `config/` would only cover `config/`)

### Page conventions

Images go in `images/`, and every image needs alt text. Book covers for the book club section go in `images/books`.

Every page links `css/style.css`, which holds the main styles and works without JavaScript. A style that only one page needs goes in a small `<style>` tag in that page's `<head>` (like the section headings in `data_policy_092326.html`). The styles expect a `header` with `.navbar`, a `.landing` block, `.main` holding `.row` and `.column`, and a `footer`. Book cards are `figure.box` elements with `.cover`, `.title`, and `.author` inside. The cards have a fixed size so rows line up, but very small screens or unusual cover shapes might need adjusting. The CSS uses modern features like `position: sticky` and `vh`/`vw` units, which current browsers support.

The header (with the top bar) and the footer are copied into every page. Each copy sits between marker comments, like `<!-- shared: header -->` and `<!-- /shared: header -->`. There's no build step, so each copy is plain HTML that you edit by hand, and any page opens straight in a browser. To change the top bar, make the same edit in every page:

- `index.html`
- `data_policy_092326.html`
- `handbook_101525.html`

`npm run lint:shared` runs `config/check-shared.mjs`, which compares each copy with `index.html` and names any page that differs. The pre-commit hook and CI run it too, so a missed page gets caught. Nav links point at `index.html#Section` rather than `#Section`, so the top bar works the same from every page.

To add a page, copy an existing one so it starts with the head tags, the stylesheet link, the header, and the footer. Then add it to the list above, to the `urls` list in `config/pa11y.config.json`, and to the tree in the README.
