import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));
vi.mock('../src/git.js', () => ({
  commitAndPushByRepo: vi.fn(async () => {}),
  resolveRepoRoot: vi.fn(),
}));

import { input } from '@inquirer/prompts';
import type { RunSyncArticlesDeps, SyncContext } from '../src/cli.js';
import { runBaseline, runSyncArticles, syncSingleArticle } from '../src/cli.js';
import type { DevtoArticleSummary } from '../src/devto-status.js';
import { commitAndPushByRepo } from '../src/git.js';
import type { Article } from '../src/types.js';
import { computeWebsiteContentHash } from '../src/website-status.js';

function makeDevtoArticle(canonicalUrl: string | null, url: string): DevtoArticleSummary {
  // biome-ignore lint/style/useNamingConvention: dev.to API response field
  return { canonical_url: canonicalUrl, url };
}

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
        instagram: { status: 'pending' },
      },
    },
  };
}

function makeContext(): SyncContext {
  return {
    siteIndexPath: SITE_INDEX_PATH,
    siteBaseUrl: 'https://joeblack.nyc',
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
      instagram: { platform: 'instagram', publish: vi.fn() },
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
      new Set([
        '/articles/one.md',
        '/articles/two.md',
        SITE_INDEX_PATH,
        '/fake/site/writing/one/index.html',
        '/fake/site/writing/two/index.html',
      ]),
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
    expect(new Set(paths)).toEqual(
      new Set(['/articles/one.md', SITE_INDEX_PATH, '/fake/site/writing/one/index.html']),
    );
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

describe('syncSingleArticle', () => {
  let siteDir: string;
  let siteIndexPath: string;
  let articleFilePath: string;

  beforeEach(async () => {
    siteDir = await mkdtemp(join(tmpdir(), 'syndicate-cli-site-'));
    siteIndexPath = join(siteDir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
    await mkdir(join(siteDir, 'writing', 'alpha-post'), { recursive: true });
    await writeFile(join(siteDir, 'writing', 'alpha-post', 'index.html'), '<html></html>', 'utf8');

    const articlesDir = await mkdtemp(join(tmpdir(), 'syndicate-cli-article-'));
    articleFilePath = join(articlesDir, 'alpha-post.md');
  });

  function makeArticle(): Article {
    const article: Article = {
      filePath: articleFilePath,
      content: 'The article body.',
      frontmatter: {
        title: 'Alpha Post',
        slug: 'alpha-post',
        status: 'ready',
        tags: ['ai'],
        description: '',
        publishedAt: null,
        syndication: {
          // Deliberately different from website.url below — a stand-in for the pre-fix
          // code, which read this field as the canonical URL / website lookup key.
          substack: { status: 'synced', url: 'https://sub.example.com/p/decoy' },
          medium: { status: 'synced', url: null },
          devto: { status: 'pending', url: null },
          website: { status: 'synced', url: 'https://joeblack.nyc/writing/alpha-post/' },
          x: { status: 'synced', url: null },
          linkedin: { status: 'synced', url: null },
          facebook: { status: 'synced', url: null },
          instagram: { status: 'synced', url: null },
        },
      },
    };
    // These tests exercise devto/slug-matching logic, not content staleness — stamp a
    // matching hash so the website is read as 'current', not 'stale'.
    article.frontmatter.websiteContentHash = computeWebsiteContentHash(article);
    return article;
  }

  function makeContext(devtoArticles: DevtoArticleSummary[]): {
    context: SyncContext;
    listMyArticles: ReturnType<typeof vi.fn>;
    createArticle: ReturnType<typeof vi.fn>;
  } {
    const listMyArticles = vi.fn(async () => devtoArticles);
    const createArticle = vi.fn(async () => ({ url: 'https://dev.to/joe/alpha-post' }));
    const context: SyncContext = {
      siteIndexPath,
      siteBaseUrl: 'https://joeblack.nyc',
      devtoClient: { listMyArticles },
      devtoPostClient: { createArticle },
      draftModel: { generate: vi.fn() },
      editPrompt: vi.fn(),
      manualPublishers: {
        substack: { platform: 'substack', publish: vi.fn() },
        medium: { platform: 'medium', publish: vi.fn() },
        x: { platform: 'x', publish: vi.fn() },
        linkedin: { platform: 'linkedin', publish: vi.fn() },
        facebook: { platform: 'facebook', publish: vi.fn() },
        instagram: { platform: 'instagram', publish: vi.fn() },
      },
    };
    return { context, listMyArticles, createArticle };
  }

  it('checks website liveness against the article slug, not a URL', async () => {
    const article = makeArticle();
    // dev.to already has a matching canonical URL for the *website* URL, so — once the
    // website-liveness check is also correct — there is nothing left to sync at all.
    const { context } = makeContext([
      makeDevtoArticle('https://joeblack.nyc/writing/alpha-post/', 'https://dev.to/existing'),
    ]);

    const changed = await syncSingleArticle(article, context);

    // The pre-fix code passed `syndication.substack.url` (a decoy here, not matching any
    // directory under site/writing/) as the *slug* to isArticleOnWebsite, so it would
    // wrongly conclude the page didn't exist, re-run syncWebsite, and set publishedAt.
    expect(changed).toBe(false);
    expect(article.frontmatter.publishedAt).toBeNull();
    expect(article.frontmatter.syndication.website).toEqual({
      status: 'synced',
      url: 'https://joeblack.nyc/writing/alpha-post/',
    });
  });

  it('compares against syndication.website.url, not syndication.substack.url, when checking dev.to', async () => {
    const article = makeArticle();
    // dev.to's canonical URL matches the *substack* decoy, not the website URL. The pre-fix
    // code compared against substack.url and would have found this a match; the fix compares
    // against website.url and must NOT match, forcing an actual dev.to publish.
    const { context, createArticle } = makeContext([
      makeDevtoArticle('https://sub.example.com/p/decoy', 'https://dev.to/wrong-match'),
    ]);

    const changed = await syncSingleArticle(article, context);

    expect(changed).toBe(true);
    expect(createArticle).toHaveBeenCalledOnce();
    expect(createArticle).toHaveBeenCalledWith(
      expect.objectContaining({ canonicalUrl: 'https://joeblack.nyc/writing/alpha-post/' }),
    );
    expect(article.frontmatter.syndication.devto).toEqual({
      status: 'synced',
      url: 'https://dev.to/joe/alpha-post',
    });
  });

  it('regenerates the website page when the article content has changed since the last sync', async () => {
    const article = makeArticle();
    article.frontmatter.websiteTag = 'Alpha Tag';
    article.frontmatter.syndication.devto = {
      status: 'synced',
      url: 'https://dev.to/joe/alpha-post',
    };
    // Content changed after the stored hash was computed — simulates an edit made to the
    // source markdown without re-running sync yet.
    article.content = 'The article body, now with a correction.';
    const { context } = makeContext([
      makeDevtoArticle('https://joeblack.nyc/writing/alpha-post/', 'https://dev.to/joe/alpha-post'),
    ]);

    const changed = await syncSingleArticle(article, context);

    expect(changed).toBe(true);
    const pageHtml = await readFile(join(siteDir, 'writing', 'alpha-post', 'index.html'), 'utf8');
    expect(pageHtml).toContain('now with a correction');
    expect(article.frontmatter.websiteContentHash).toBe(computeWebsiteContentHash(article));
  });
});

describe('runBaseline', () => {
  let filePath: string;

  const fixture = `---
title: Existing Post
slug: existing-post
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
  instagram: { status: pending }
---

Body.
`;

  beforeEach(async () => {
    vi.mocked(input).mockReset();
    vi.mocked(input).mockResolvedValue('n');
    vi.mocked(commitAndPushByRepo).mockClear();

    const dir = await mkdtemp(join(tmpdir(), 'syndicate-cli-baseline-'));
    filePath = join(dir, 'existing-post.md');
    await writeFile(filePath, fixture, 'utf8');
  });

  it('never prompts for website status', async () => {
    await runBaseline(filePath);

    const prompted = vi.mocked(input).mock.calls.map(([opts]) => opts.message);
    expect(prompted.some((message) => message.includes('website'))).toBe(false);
  });

  it('still prompts for every other platform', async () => {
    await runBaseline(filePath);

    const prompted = vi.mocked(input).mock.calls.map(([opts]) => opts.message);
    for (const platform of [
      'substack',
      'medium',
      'devto',
      'x',
      'linkedin',
      'facebook',
      'instagram',
    ]) {
      // Anchor on the fixed template text around the platform name, not the platform name
      // alone — "Existing Post" (the fixture title) contains a literal "x", so a bare
      // `.includes(platform)` check for platform "x" would be satisfied by ANY prompted
      // message, proving nothing about whether "x" itself was actually prompted.
      expect(prompted.some((message) => message.includes(`on ${platform}?`))).toBe(true);
    }
  });
});
