import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Article } from '../src/types.js';
import { computeWebsiteContentHash, getWebsiteLiveState } from '../src/website-status.js';

function makeArticle(overrides: Partial<Article['frontmatter']> = {}): Article {
  return {
    filePath: '/tmp/article.md',
    content: 'The article body.',
    frontmatter: {
      title: 'My Slug Article',
      slug: 'my-slug',
      status: 'ready',
      tags: [],
      description: 'A description.',
      publishedAt: null,
      syndication: {
        substack: { status: 'pending', url: null },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'pending' },
        facebook: { status: 'pending' },
        instagram: { status: 'pending' },
      },
      ...overrides,
    },
  };
}

describe('computeWebsiteContentHash', () => {
  it('produces the same hash for the same content, title, and description', () => {
    const article = makeArticle();
    expect(computeWebsiteContentHash(article)).toBe(computeWebsiteContentHash(makeArticle()));
  });

  it('produces a different hash when the content changes', () => {
    const original = makeArticle();
    const changed = makeArticle();
    changed.content = 'A completely different body.';

    expect(computeWebsiteContentHash(changed)).not.toBe(computeWebsiteContentHash(original));
  });

  it('produces a different hash when websiteTag changes, since the tag is rendered on the page', () => {
    const original = makeArticle({ websiteTag: 'AI Agents' });
    const changed = makeArticle({ websiteTag: 'Claude Code' });

    expect(computeWebsiteContentHash(changed)).not.toBe(computeWebsiteContentHash(original));
  });

  it('produces a different hash when publishedAt changes, since the date is rendered on the page', () => {
    const original = makeArticle({ publishedAt: '2026-01-01T00:00:00.000Z' });
    const changed = makeArticle({ publishedAt: '2026-06-01T00:00:00.000Z' });

    expect(computeWebsiteContentHash(changed)).not.toBe(computeWebsiteContentHash(original));
  });
});

describe('getWebsiteLiveState', () => {
  let siteIndexPath: string;
  let siteDir: string;

  beforeEach(async () => {
    siteDir = await mkdtemp(join(tmpdir(), 'syndicate-site-'));
    siteIndexPath = join(siteDir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
  });

  it("returns 'missing' when the article page does not exist on disk", async () => {
    const article = makeArticle({ slug: 'missing-slug' });
    expect(await getWebsiteLiveState(siteIndexPath, article)).toBe('missing');
  });

  it("returns 'stale' when the page exists but no content hash has ever been recorded", async () => {
    await mkdir(join(siteDir, 'writing', 'my-slug'), { recursive: true });
    await writeFile(join(siteDir, 'writing', 'my-slug', 'index.html'), '<html></html>', 'utf8');

    const article = makeArticle();
    expect(await getWebsiteLiveState(siteIndexPath, article)).toBe('stale');
  });

  it("returns 'stale' when the page exists but the recorded hash no longer matches the content", async () => {
    await mkdir(join(siteDir, 'writing', 'my-slug'), { recursive: true });
    await writeFile(join(siteDir, 'writing', 'my-slug', 'index.html'), '<html></html>', 'utf8');

    const article = makeArticle({ websiteContentHash: 'stale-hash-from-a-previous-version' });
    expect(await getWebsiteLiveState(siteIndexPath, article)).toBe('stale');
  });

  it("returns 'current' when the page exists and the recorded hash matches the content", async () => {
    await mkdir(join(siteDir, 'writing', 'my-slug'), { recursive: true });
    await writeFile(join(siteDir, 'writing', 'my-slug', 'index.html'), '<html></html>', 'utf8');

    const article = makeArticle();
    article.frontmatter.websiteContentHash = computeWebsiteContentHash(article);

    expect(await getWebsiteLiveState(siteIndexPath, article)).toBe('current');
  });
});
