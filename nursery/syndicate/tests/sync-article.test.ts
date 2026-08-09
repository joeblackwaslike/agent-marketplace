import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
      description: '',
      publishedAt: null,
      syndication: {
        substack: { status: 'synced', url: 'https://sub.example.com/p/new' },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'synced' },
        facebook: { status: 'synced' },
      },
    },
  };
}

describe('syncArticle', () => {
  let siteIndexPath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'syndicate-sync-'));
    siteIndexPath = join(dir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
  });

  it('publishes only the gap platforms and updates frontmatter accordingly', async () => {
    const article = makeArticle();
    const mediumPublish = vi.fn(async () => ({ status: 'synced' as const }));
    const xPublish = vi.fn(async () => ({ status: 'synced' as const }));

    const persistFrontmatter = vi.fn(async () => {});

    const deps: SyncArticleDeps = {
      live: { website: false, devtoUrl: null },
      devtoPostClient: {
        createArticle: vi.fn(async () => ({ url: 'https://dev.to/joe/new-post' })),
      },
      draftModel: {
        generate: async () => ({
          x: 'Sharp line.',
          linkedin: 'unused',
          facebook: 'unused',
          website: { tag: 'AI Agents' },
        }),
      },
      editPrompt: async (_label, initial) => initial,
      siteIndexPath,
      persistFrontmatter,
      manualPublishers: {
        substack: { platform: 'substack', publish: vi.fn() },
        medium: { platform: 'medium', publish: mediumPublish },
        x: { platform: 'x', publish: xPublish },
        linkedin: { platform: 'linkedin', publish: vi.fn() },
        facebook: { platform: 'facebook', publish: vi.fn() },
      },
    };

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(mediumPublish).toHaveBeenCalledOnce();
    expect(xPublish).toHaveBeenCalledWith(expect.objectContaining({ caption: 'Sharp line.' }));
    expect(article.frontmatter.syndication.medium.status).toBe('synced');
    expect(article.frontmatter.syndication.devto).toEqual({
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    });
    expect(article.frontmatter.syndication.website.status).toBe('synced');

    const html = await readFile(siteIndexPath, 'utf8');
    expect(html).toContain('New Post');

    // one persist call per gap platform actioned (medium, devto, website, x)
    expect(persistFrontmatter).toHaveBeenCalledTimes(4);
    expect(persistFrontmatter).toHaveBeenLastCalledWith(article);
  });

  it('returns false and touches nothing when there are no gaps', async () => {
    const article = makeArticle();
    article.frontmatter.syndication.medium = { status: 'synced', url: null };
    article.frontmatter.syndication.website = { status: 'synced' };
    article.frontmatter.syndication.x = { status: 'synced', url: null };

    const deps: SyncArticleDeps = {
      live: { website: true, devtoUrl: 'https://dev.to/joe/new-post' },
      devtoPostClient: { createArticle: vi.fn() },
      draftModel: { generate: vi.fn() },
      editPrompt: vi.fn(),
      siteIndexPath,
      persistFrontmatter: vi.fn(async () => {}),
      manualPublishers: {
        substack: { platform: 'substack', publish: vi.fn() },
        medium: { platform: 'medium', publish: vi.fn() },
        x: { platform: 'x', publish: vi.fn() },
        linkedin: { platform: 'linkedin', publish: vi.fn() },
        facebook: { platform: 'facebook', publish: vi.fn() },
      },
    };
    article.frontmatter.syndication.devto = {
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    };

    const changed = await syncArticle(article, deps);
    expect(changed).toBe(false);
  });
});
