import { describe, expect, it, vi } from 'vitest';
import type { RunSyncArticlesDeps, SyncContext } from '../src/cli.js';
import { runSyncArticles } from '../src/cli.js';
import type { Article } from '../src/types.js';

const SITE_INDEX_PATH = '/fake/site/index.html';

function makeArticle(filePath: string, title: string): Article {
  return {
    filePath,
    content: 'The article body.',
    frontmatter: {
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      status: 'ready',
      tags: ['ai'],
      description: '',
      publishedAt: null,
      syndication: {
        substack: { status: 'synced', url: `https://sub.example.com/p/${title}` },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'pending' },
        facebook: { status: 'pending' },
      },
    },
  };
}

function makeContext(): SyncContext {
  return {
    siteIndexPath: SITE_INDEX_PATH,
    devtoClient: { listMyArticles: vi.fn() },
    devtoPostClient: { createArticle: vi.fn() },
    draftModel: { generate: vi.fn() },
    editPrompt: vi.fn(),
    manualPublishers: {
      substack: { platform: 'substack', publish: vi.fn() },
      medium: { platform: 'medium', publish: vi.fn() },
      x: { platform: 'x', publish: vi.fn() },
      linkedin: { platform: 'linkedin', publish: vi.fn() },
      facebook: { platform: 'facebook', publish: vi.fn() },
    },
  };
}

describe('runSyncArticles', () => {
  it('commits once with the deduplicated changed-files list when multiple articles have changes', async () => {
    const article1 = makeArticle('/articles/one.md', 'One');
    const article2 = makeArticle('/articles/two.md', 'Two');
    const syncOne = vi.fn(async () => true);
    const commitAndPush = vi.fn(async () => {});
    const deps: RunSyncArticlesDeps = { syncOne, commitAndPush };

    await runSyncArticles([article1, article2], makeContext(), deps);

    expect(commitAndPush).toHaveBeenCalledOnce();
    const [paths, message] = commitAndPush.mock.calls[0] as [string[], string];
    expect(new Set(paths)).toEqual(
      new Set(['/articles/one.md', '/articles/two.md', SITE_INDEX_PATH]),
    );
    expect(message).toBe('chore(syndicate): sync articles');
  });

  it('does not call commitAndPush when no articles have gaps', async () => {
    const article1 = makeArticle('/articles/one.md', 'One');
    const article2 = makeArticle('/articles/two.md', 'Two');
    const syncOne = vi.fn(async () => false);
    const commitAndPush = vi.fn(async () => {});
    const deps: RunSyncArticlesDeps = { syncOne, commitAndPush };

    await runSyncArticles([article1, article2], makeContext(), deps);

    expect(commitAndPush).not.toHaveBeenCalled();
  });

  it('commits the completed work before rethrowing when a later article throws', async () => {
    const article1 = makeArticle('/articles/one.md', 'One');
    const article2 = makeArticle('/articles/two.md', 'Two');
    const syncOne = vi
      .fn<(article: Article) => Promise<boolean>>()
      .mockImplementationOnce(async () => true)
      .mockImplementationOnce(async () => {
        throw new Error('network blip');
      });
    const commitAndPush = vi.fn(async () => {});
    const deps: RunSyncArticlesDeps = { syncOne, commitAndPush };

    await expect(runSyncArticles([article1, article2], makeContext(), deps)).rejects.toThrow(
      /Failed syncing "\/articles\/two\.md": network blip/,
    );

    expect(commitAndPush).toHaveBeenCalledOnce();
    const [paths, message] = commitAndPush.mock.calls[0] as [string[], string];
    expect(new Set(paths)).toEqual(new Set(['/articles/one.md', SITE_INDEX_PATH]));
    expect(message).toBe('chore(syndicate): sync articles (partial run)');
  });

  it('preserves the git-status reminder and original error as cause when an article throws', async () => {
    const article1 = makeArticle('/articles/one.md', 'One');
    const originalError = new Error('network blip');
    const syncOne = vi.fn(async () => {
      throw originalError;
    });
    const commitAndPush = vi.fn(async () => {});
    const deps: RunSyncArticlesDeps = { syncOne, commitAndPush };

    let caught: unknown;
    try {
      await runSyncArticles([article1], makeContext(), deps);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    const error = caught as Error;
    expect(error.message).toContain('check git status');
    expect(error.cause).toBe(originalError);
    expect(commitAndPush).not.toHaveBeenCalled();
  });
});
