import { describe, expect, it } from 'vitest';
import { computeGaps } from '../src/diff.js';
import type { Article } from '../src/types.js';

function makeArticle(overrides: Partial<Article['frontmatter']['syndication']>): Article {
  return {
    filePath: '/tmp/a.md',
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
        ...overrides,
      },
    },
  };
}

describe('computeGaps', () => {
  it("returns only ['substack'] when substack is not yet synced, regardless of others", () => {
    const article = makeArticle({ x: { status: 'synced' } });
    expect(computeGaps(article, { website: true, devtoUrl: 'https://dev.to/x' })).toEqual([
      'substack',
    ]);
  });

  it('returns remaining gaps in fixed order once substack is synced', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
      x: { status: 'synced' },
      facebook: { status: 'synced' },
    });
    expect(computeGaps(article, { website: false, devtoUrl: null })).toEqual([
      'medium',
      'devto',
      'website',
      'linkedin',
    ]);
  });

  it('returns an empty array when everything is synced', () => {
    const synced = { status: 'synced' as const };
    const article = makeArticle({
      substack: { ...synced, url: 'https://sub.example.com/p/x' },
      medium: synced,
      x: synced,
      linkedin: synced,
      facebook: synced,
    });
    expect(computeGaps(article, { website: true, devtoUrl: 'https://dev.to/x' })).toEqual([]);
  });

  it('gates on substack even when every other platform is already marked synced', () => {
    const synced = { status: 'synced' as const };
    const article = makeArticle({
      substack: { status: 'pending', url: null },
      medium: synced,
      devto: synced,
      x: synced,
      linkedin: synced,
      facebook: synced,
    });
    expect(computeGaps(article, { website: true, devtoUrl: 'https://dev.to/x' })).toEqual([
      'substack',
    ]);
  });

  it('treats live website/devto truth independently of frontmatter for those two platforms', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
      medium: { status: 'synced' },
      x: { status: 'synced' },
      linkedin: { status: 'synced' },
      facebook: { status: 'synced' },
    });
    expect(computeGaps(article, { website: false, devtoUrl: null })).toEqual(['devto', 'website']);
  });
});
