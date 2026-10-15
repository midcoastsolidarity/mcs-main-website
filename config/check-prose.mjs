// House style checks for prose. Two modes:
//
//   node config/check-prose.mjs                    page copy and docs
//   node config/check-prose.mjs --commit-msg FILE  a commit message
//
// The rules are the ones written down under House style in CONTRIBUTING.md.
// Page copy is the text most people actually read, so it is worth linting the
// same way the CSS and the markup are.
//
// Deliberately dependency-free. The commit-msg hook runs before anything is
// installed on a fresh clone, and CI should not need another package for a
// hundred lines of regex.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', '.husky', 'images']);
const TEXT_EXT = /\.(html|md)$/;

// The wide dashes. A comma, a colon or a full stop reads better, and a plain
// hyphen is fine for a range.
const DASHES = /[\u2014\u2013]/;
// Characters that default to emoji presentation, plus the variation selector
// that forces it. Deliberately narrower than "any dingbat": U+276F is the
// prompt glyph in the README code blocks and is not an emoji.
const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u;

const problems = [];
const flag = (where, line, msg) => problems.push({ where, line, msg });

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT_EXT.test(entry)) out.push(full);
  }
  return out;
}

function checkTypography(text, where, offset = 0) {
  text.split('\n').forEach((line, i) => {
    const n = i + 1 + offset;
    if (DASHES.test(line)) flag(where, n, 'wide dash; use a comma, a colon, or a full stop');
    if (EMOJI.test(line)) flag(where, n, 'emoji');
  });
}

function checkContent() {
  for (const file of walk(ROOT)) {
    checkTypography(readFileSync(file, 'utf8'), relative(ROOT, file));
  }
}

// --- commit message ---------------------------------------------------

const TRAILER = /^[A-Z][A-Za-z]*(-[A-Za-z]+)*:\s/;
const REF = /^(Closes|Fixes|Resolves|Refs|See)\b/i;
const LIST = /^\s*([-*+]|\d+\.)\s/;
const FENCE = /^\s*```/;

// The repository-local identity, not the global one. Each site sets its own
// account in .git/config, and a co-author trailer should never carry anything
// else. Unset means reject: better to ask than to guess.
function accountEmail() {
  try {
    const out = execFileSync('git', ['config', '--local', 'user.email'], { encoding: 'utf8' });
    return out.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function checkCommitMsg(file) {
  const raw = readFileSync(file, 'utf8');
  // Drop git's comment lines and everything below a verbose-commit scissors
  // line, so the diff being committed is never scanned.
  const scissors = raw.indexOf('\n# ------------------------ >8');
  const body = (scissors === -1 ? raw : raw.slice(0, scissors))
    .split('\n')
    .filter((l) => !l.startsWith('#'));

  const subject = (body[0] ?? '').trim();
  // git writes these itself, or generates them from a template.
  if (/^(Merge|Revert)\s/.test(subject) || /^(fixup|squash)!/.test(subject)) return;

  const where = 'commit message';
  checkTypography(body.join('\n'), where);

  body.forEach((line, i) => {
    const n = i + 1;
    // "Generated with X", "Written by Y". Credit lines belong in the PR
    // conversation if anywhere; the body should say what changed.
    if (/^\s*(generated|authored|written|drafted|created|co-?authored)\s+(with|by)\b/i.test(line)) {
      flag(where, n, 'credits a tool or a third party; say what the change does instead');
    }
    const coAuthor = line.match(/^Co-authored-by:.*<([^>]+)>/i);
    if (coAuthor) {
      const email = coAuthor[1].toLowerCase();
      const own = accountEmail();
      if (email !== own) {
        flag(where, n, `Co-authored-by names ${email}, which is not this repository's account`);
      }
    }
  });

  // Bodies are unwrapped paragraphs: one line per paragraph, blank line
  // between them. A line that stops in the 60-80 column band with more prose
  // directly under it is a hard wrap.
  let fenced = false;
  for (let i = 1; i < body.length - 1; i++) {
    const line = body[i];
    const next = body[i + 1];
    if (FENCE.test(line)) fenced = !fenced;
    if (fenced) continue;
    if (line.length < 60 || line.length > 80) continue;
    if (!next.trim()) continue;
    if (TRAILER.test(line) || REF.test(line)) continue;
    if (TRAILER.test(next) || REF.test(next) || LIST.test(next) || FENCE.test(next)) continue;
    flag(where, i + 1, 'body looks hard wrapped; write each paragraph as one line');
  }
}

// --- run --------------------------------------------------------------

const arg = process.argv.indexOf('--commit-msg');
if (arg === -1) checkContent();
else checkCommitMsg(process.argv[arg + 1]);

if (problems.length) {
  for (const p of problems) console.error(`${p.where}:${p.line}: ${p.msg}`);
  console.error(`\n${problems.length} house style problem(s). See CONTRIBUTING.md.`);
  process.exit(1);
}
