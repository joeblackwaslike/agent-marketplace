import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { readArticle, writeArticleFrontmatter } from '../src/frontmatter.js';

const FIXTURE = `---
title: Test Article
slug: test-article
status: ready
tags: [testing]
description: A test.
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

This is the article body.

It has two paragraphs.
`;

describe('frontmatter round-trip', () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'syndicate-test-'));
    filePath = join(dir, 'test-article.md');
    await writeFile(filePath, FIXTURE, 'utf8');
  });

  it('preserves content and reads frontmatter fields', async () => {
    const article = await readArticle(filePath);
    expect(article.frontmatter.title).toBe('Test Article');
    expect(article.frontmatter.status).toBe('ready');
    expect(article.content.trim()).toBe('This is the article body.\n\nIt has two paragraphs.');
  });

  it('writes only frontmatter changes, leaving content untouched', async () => {
    const article = await readArticle(filePath);
    article.frontmatter.syndication.substack = {
      status: 'synced',
      url: 'https://example.com/p/test',
    };
    await writeArticleFrontmatter(article);

    const reread = await readArticle(filePath);
    expect(reread.frontmatter.syndication.substack.status).toBe('synced');
    expect(reread.content.trim()).toBe(article.content.trim());
  });
});
