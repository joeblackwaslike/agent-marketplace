import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncArticleDeps } from '../src/sync-article.js';
import { syncArticle } from '../src/sync-article.js';
import type { Article } from '../src/types.js';

function makeArticle(): Article {
  return {
    filePath: '/tmp/article.md',
    content: 'The article body.',
    frontmatter: {
      title: 'New Post',
      slug: 'new-post',
      status: 'ready',
      tags: ['ai'],
      description: 'A description.',
      publishedAt: null,
      syndication: {
        substack: { status: 'pending', url: null },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'synced' },
        facebook: { status: 'synced' },
        instagram: { status: 'pending' },
      },
    },
  };
}

function makeDeps(
  siteIndexPath: string,
  overrides: Partial<SyncArticleDeps> = {},
): SyncArticleDeps {
  return {
    live: { website: 'missing', devtoUrl: null },
    devtoPostClient: { createArticle: vi.fn(async () => ({ url: 'https://dev.to/joe/new-post' })) },
    draftModel: {
      generate: async () => ({
        x: 'Sharp line.',
        linkedin: 'unused',
        facebook: 'unused',
        instagram: 'unused',
        website: { tag: 'AI Agents' },
      }),
    },
    editPrompt: async (_label, initial) => initial,
    siteIndexPath,
    siteBaseUrl: 'https://joeblack.nyc',
    persistFrontmatter: vi.fn(async () => {}),
    manualPublishers: {
      substack: {
        platform: 'substack',
        publish: vi.fn(async () => ({ status: 'synced' as const })),
      },
      medium: { platform: 'medium', publish: vi.fn(async () => ({ status: 'synced' as const })) },
      x: { platform: 'x', publish: vi.fn(async () => ({ status: 'synced' as const })) },
      linkedin: { platform: 'linkedin', publish: vi.fn() },
      facebook: { platform: 'facebook', publish: vi.fn() },
      instagram: {
        platform: 'instagram',
        publish: vi.fn(async () => ({ status: 'synced' as const })),
      },
    },
    ...overrides,
  };
}

describe('syncArticle', () => {
  let siteIndexPath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'syndicate-sync-'));
    siteIndexPath = join(dir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
  });

  it('syncs only the website when it is not yet live, and records its own URL', async () => {
    const article = makeArticle();
    const deps = makeDeps(siteIndexPath);

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(article.frontmatter.syndication.website).toEqual({
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    });
    expect(article.frontmatter.publishedAt).not.toBeNull();
    expect(article.frontmatter.syndication.substack.status).toBe('pending');
    expect(deps.manualPublishers.substack.publish).not.toHaveBeenCalled();

    const pageHtml = await readFile(
      join(dirname(siteIndexPath), 'writing', 'new-post', 'index.html'),
      'utf8',
    );
    expect(pageHtml).toContain('New Post');
    expect(pageHtml).toContain('AI Agents');

    const html = await readFile(siteIndexPath, 'utf8');
    expect(html).toContain('href="/writing/new-post/"');
    expect(html).toContain('AI Agents');
  });

  it('publishes downstream platforms with the website URL as canonical, once the website is live', async () => {
    const article = makeArticle();
    article.frontmatter.syndication.website = {
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    };
    const deps = makeDeps(siteIndexPath, { live: { website: 'current', devtoUrl: null } });

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(deps.manualPublishers.substack.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        articleUrl: 'https://joeblack.nyc/writing/new-post/',
        articleContent: 'The article body.',
      }),
    );
    expect(deps.manualPublishers.medium.publish).toHaveBeenCalledWith(
      expect.objectContaining({ articleUrl: 'https://joeblack.nyc/writing/new-post/' }),
    );
    expect(deps.manualPublishers.medium.publish.mock.calls[0][0].articleContent).toBeUndefined();
    expect(article.frontmatter.syndication.devto).toEqual({
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    });
  });

  it('returns false and touches nothing when there are no gaps', async () => {
    const article = makeArticle();
    article.frontmatter.syndication.website = {
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    };
    article.frontmatter.syndication.substack = {
      status: 'synced',
      url: 'https://sub.example.com/p/new',
    };
    article.frontmatter.syndication.medium = { status: 'synced', url: null };
    article.frontmatter.syndication.x = { status: 'synced', url: null };
    article.frontmatter.syndication.devto = {
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    };
    article.frontmatter.syndication.instagram = { status: 'synced', url: null };

    const deps = makeDeps(siteIndexPath, {
      live: { website: 'current', devtoUrl: 'https://dev.to/joe/new-post' },
    });

    const changed = await syncArticle(article, deps);
    expect(changed).toBe(false);
  });

  it('preserves the original publishedAt when re-syncing a stale website page', async () => {
    const article = makeArticle();
    article.frontmatter.publishedAt = '2026-01-01T00:00:00.000Z';
    article.frontmatter.syndication.website = {
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    };
    article.frontmatter.syndication.substack = {
      status: 'synced',
      url: 'https://sub.example.com/p/new',
    };
    article.frontmatter.syndication.medium = { status: 'synced', url: null };
    article.frontmatter.syndication.x = { status: 'synced', url: null };
    article.frontmatter.syndication.devto = {
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    };
    article.frontmatter.syndication.instagram = { status: 'synced', url: null };
    const deps = makeDeps(siteIndexPath, {
      live: { website: 'stale', devtoUrl: 'https://dev.to/joe/new-post' },
    });

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(article.frontmatter.publishedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(deps.manualPublishers.substack.publish).not.toHaveBeenCalled();
  });

  it('reuses a cached websiteTag without calling the draft model when refreshing a stale page', async () => {
    const article = makeArticle();
    article.frontmatter.websiteTag = 'Cached Tag';
    article.frontmatter.syndication.website = {
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    };
    article.frontmatter.syndication.substack = {
      status: 'synced',
      url: 'https://sub.example.com/p/new',
    };
    article.frontmatter.syndication.medium = { status: 'synced', url: null };
    article.frontmatter.syndication.x = { status: 'synced', url: null };
    article.frontmatter.syndication.devto = {
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    };
    article.frontmatter.syndication.instagram = { status: 'synced', url: null };
    const generate = vi.fn(async () => ({
      x: 'unused',
      linkedin: 'unused',
      facebook: 'unused',
      instagram: 'unused',
      website: { tag: 'Freshly Drafted Tag' },
    }));
    const deps = makeDeps(siteIndexPath, {
      live: { website: 'stale', devtoUrl: 'https://dev.to/joe/new-post' },
      draftModel: { generate },
    });

    await syncArticle(article, deps);

    expect(generate).not.toHaveBeenCalled();
    const pageHtml = await readFile(
      join(dirname(siteIndexPath), 'writing', 'new-post', 'index.html'),
      'utf8',
    );
    expect(pageHtml).toContain('Cached Tag');
    expect(pageHtml).not.toContain('Freshly Drafted Tag');
  });

  it('stamps a websiteContentHash after syncing the website', async () => {
    const article = makeArticle();
    const deps = makeDeps(siteIndexPath);

    await syncArticle(article, deps);

    expect(article.frontmatter.websiteContentHash).toBeTruthy();
  });

  it('does not persist the new websiteContentHash until after the page and site-index writes succeed', async () => {
    const article = makeArticle();
    const persistedHashes: (string | undefined)[] = [];
    const deps = makeDeps(siteIndexPath, {
      persistFrontmatter: vi.fn(async (a: Article) => {
        persistedHashes.push(a.frontmatter.websiteContentHash);
      }),
    });

    await syncArticle(article, deps);

    // First persist (canonical-URL durability, before the page file exists) must not
    // carry the new hash yet - otherwise a crash between it and the page write would
    // leave frontmatter claiming a hash the on-disk page doesn't actually match, and
    // getWebsiteLiveState would wrongly report 'current' forever.
    expect(persistedHashes[0]).toBeUndefined();
    expect(persistedHashes.at(-1)).toBe(article.frontmatter.websiteContentHash);
  });
});
