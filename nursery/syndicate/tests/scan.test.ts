import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { scanReadyArticles } from '../src/scan.js';

const readyArticle = `---
title: Ready Article
slug: ready-article
status: ready
tags: []
description: ""
publishedAt: null
syndication:
  substack: { status: pending, url: null }
  medium: { status: pending, url: null }
  devto: { status: pending, url: null }
  website: { status: pending }
  x: { status: pending }
  linkedin: { status: pending }
  facebook: { status: pending }
---
Ready body.
`;

const draftArticle = readyArticle
  .replace('status: ready', 'status: draft')
  .replace('Ready Article', 'Draft Article');

describe('scanReadyArticles', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'syndicate-scan-'));
    await writeFile(join(dir, 'ready.md'), readyArticle, 'utf8');
    await writeFile(join(dir, 'draft.md'), draftArticle, 'utf8');
  });

  it('returns only status: ready articles', async () => {
    const articles = await scanReadyArticles(dir);
    expect(articles).toHaveLength(1);
    expect(articles[0].frontmatter.title).toBe('Ready Article');
  });
});
