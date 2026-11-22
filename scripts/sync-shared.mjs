#!/usr/bin/env node
// Copies the shared clinical logic (shared/src) into each app.
//
//   node scripts/sync-shared.mjs          copy
//   node scripts/sync-shared.mjs --check  fail if any copy is out of date
//
// The three apps are built by different tools (tsc, Vite, Metro) and deployed
// separately, so each gets its own generated copy instead of a linked package.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'shared', 'src');
const targets = ['server/src/shared', 'client/src/shared', 'ICUMobile/src/shared'].map(t => join(root, t));
const header = '// GENERATED from /shared/src — do not edit here. Run: node scripts/sync-shared.mjs\n\n';
const check = process.argv.includes('--check');

const files = readdirSync(source).filter(f => f.endsWith('.ts')).sort();
let stale = 0;

for (const target of targets) {
  if (!check) mkdirSync(target, { recursive: true });
  for (const file of files) {
    const wanted = header + readFileSync(join(source, file), 'utf8');
    const dest = join(target, file);
    const current = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
    if (current === wanted) continue;
    if (check) { console.error(`out of date: ${dest}`); stale++; }
    else writeFileSync(dest, wanted);
  }
  // Remove copies of files that no longer exist in shared/src.
  if (existsSync(target)) {
    for (const file of readdirSync(target).filter(f => f.endsWith('.ts'))) {
      if (files.includes(file)) continue;
      if (check) { console.error(`left over: ${join(target, file)}`); stale++; }
      else rmSync(join(target, file));
    }
  }
}

if (check) {
  if (stale) { console.error(`\n${stale} file(s) differ. Run: node scripts/sync-shared.mjs`); process.exit(1); }
  console.log('shared copies are up to date');
} else {
  console.log(`synced ${files.length} files to ${targets.length} apps`);
}
