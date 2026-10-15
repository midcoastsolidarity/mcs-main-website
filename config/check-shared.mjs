// Checks that the blocks every page shares are the same on every page.
//
//   node config/check-shared.mjs
//
// Every page has its own copy of the header (with the top bar) and the
// footer. That way any page opens on its own, without a build step. The
// copies sit between marker comments:
//
//   <!-- shared: header -->
//   ...
//   <!-- /shared: header -->
//
// index.html is the reference. Every other page in the repo root must have
// each block index.html has, and its copy must match byte for byte. This only
// reports; fix a miss by editing the page by hand.
//
// Deliberately dependency-free, like check-prose.mjs.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const REFERENCE = 'index.html';
const BLOCK = /<!-- shared: ([\w-]+) -->\n([\s\S]*?)<!-- \/shared: \1 -->/g;

function blocks(file) {
  const found = new Map();
  for (const [, name, body] of readFileSync(join(ROOT, file), 'utf8').matchAll(BLOCK)) {
    found.set(name, found.has(name) ? null : body);
  }
  return found;
}

const problems = [];
const reference = blocks(REFERENCE);
if (reference.size === 0) problems.push(`${REFERENCE}: no shared blocks found, so there is nothing to compare`);
for (const [name, body] of reference) {
  if (body === null) problems.push(`${REFERENCE}: the ${name} block appears more than once`);
}

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== REFERENCE);
for (const page of pages) {
  const own = blocks(page);
  for (const [name, body] of reference) {
    if (body === null) continue;
    if (!own.has(name)) problems.push(`${page}: missing the ${name} block`);
    else if (own.get(name) === null) problems.push(`${page}: the ${name} block appears more than once`);
    else if (own.get(name) !== body) problems.push(`${page}: the ${name} block differs from ${REFERENCE}`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(p);
  console.error('\nCopy the block from index.html into each page listed. See CONTRIBUTING.md.');
  process.exit(1);
}
console.log(`Shared blocks match on ${pages.length + 1} pages.`);
