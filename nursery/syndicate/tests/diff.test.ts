import { describe, expect, it } from 'vitest';
import { computeGaps } from '../src/diff.js';
import type { Article } from '../src/types.js';

function makeArticle(overrides: Partial<Article['frontmatter']['syndication']> = {}): Article {
  return {
    filePath: '/tmp/article.md',
    content: 'body',
    frontmatter: {
      title: 'T',
      slug: 't',
      status: 'ready',
      tags: [],
      description: '',
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
        ...overrides,
      },
    },
  };
}

describe('computeGaps', () => {
  it('returns only website when the website is not yet live, regardless of other statuses', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
    });

    const gaps = computeGaps(article, { website: false, devtoUrl: null });

    expect(gaps).toEqual(['website']);
  });

  it('returns downstream gaps once the website is live', () => {
    const article = makeArticle();

    const gaps = computeGaps(article, { website: true, devtoUrl: null });

    expect(gaps).toEqual(['substack', 'medium', 'devto', 'x', 'linkedin', 'facebook', 'instagram']);
  });

  it('excludes platforms already synced or live', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
      medium: { status: 'synced', url: null },
      x: { status: 'synced', url: null },
    });

    const gaps = computeGaps(article, {
      website: true,
      devtoUrl: 'https://dev.to/joe/x',
    });

    expect(gaps).toEqual(['linkedin', 'facebook', 'instagram']);
  });

  it('returns an empty array when everything is synced or live', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
      medium: { status: 'synced', url: null },
      x: { status: 'synced', url: null },
      linkedin: { status: 'synced', url: null },
      facebook: { status: 'synced', url: null },
      instagram: { status: 'synced', url: null },
    });

    const gaps = computeGaps(article, {
      website: true,
      devtoUrl: 'https://dev.to/joe/x',
    });

    expect(gaps).toEqual([]);
  });
});
