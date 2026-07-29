#!/usr/bin/env node
// Refresh baked-in GitHub star counts in site/projects.js.
// Usage: node scripts/refresh-stars.mjs   (requires the `gh` CLI, authenticated)

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { PROJECTS } from '../site/projects.js';

const FILE = new URL('../site/projects.js', import.meta.url);
let src = readFileSync(FILE, 'utf8');
let updated = 0;

for (const p of PROJECTS) {
  const m = p.url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) continue;
  let stars;
  try {
    stars = Number(
      execSync(`gh api repos/${m[1]}/${m[2]} --jq .stargazers_count`, { encoding: 'utf8' }).trim(),
    );
  } catch {
    console.warn(`skip ${p.name}: fetch failed`);
    continue;
  }
  if (!Number.isFinite(stars)) continue;
  const nameEsc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(name: '${nameEsc}',[\\s\\S]*?stars: )\\d+`);
  const next = src.replace(re, `$1${stars}`);
  if (next !== src) { src = next; updated += 1; }
}

writeFileSync(FILE, src);
console.log(`projects.js stars refreshed (${updated}/${PROJECTS.length} entries updated)`);
