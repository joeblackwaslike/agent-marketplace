import { describe, expect, it } from 'vitest';
import type { Article } from '../src/types.js';
import { insertWritingCard, renderArticlePage } from '../src/website-publisher.js';

const BASE_HTML = `<section><div class="writing-list"><article>existing</article></div></section>`;

describe('insertWritingCard', () => {
  it('inserts a new card right after the writing-list marker', () => {
    const result = insertWritingCard(BASE_HTML, {
      slug: 'new-post',
      tag: 'AI Agents',
      title: 'New Post',
      url: '/writing/new-post/',
      readTime: 5,
    });

    expect(result).toContain('<span class="writing-tag">AI Agents</span>');
    expect(result).toContain('href="/writing/new-post/"');
    expect(result).toContain('5 min read');
    expect(result.indexOf('New Post')).toBeLessThan(result.indexOf('existing'));
  });

  it('HTML-escapes title and tag', () => {
    const result = insertWritingCard(BASE_HTML, {
      slug: 'x',
      tag: '<script>',
      title: 'Title with "quotes" & <tags>',
      url: '/writing/x/',
      readTime: 1,
    });

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&lt;tags&gt;');
  });

  it('HTML-escapes quotes and apostrophes, including a quote-injection attempt in url', () => {
    const result = insertWritingCard(BASE_HTML, {
      slug: 'x',
      tag: 'AI Agents',
      title: 'It\'s a "great" post',
      url: '/writing/x/?a="onclick="alert(1)',
      readTime: 1,
    });

    expect(result).toContain('&quot;');
    expect(result).toContain('&#39;');
    expect(result).not.toContain('"onclick="alert(1)');
    expect(result).toContain('href="/writing/x/?a=&quot;onclick=&quot;alert(1)"');
  });

  it('throws when the writing-list marker is missing', () => {
    expect(() =>
      insertWritingCard('<div>no marker</div>', {
        slug: 'y',
        tag: 'x',
        title: 'y',
        url: 'z',
        readTime: 1,
      }),
    ).toThrow(/writing-list/);
  });

  it('replaces an existing card for the same slug instead of inserting a duplicate', () => {
    const withCard = insertWritingCard(BASE_HTML, {
      slug: 'repeat',
      tag: 'AI Agents',
      title: 'Original Title',
      url: '/writing/repeat/',
      readTime: 5,
    });

    const result = insertWritingCard(withCard, {
      slug: 'repeat',
      tag: 'AI Agents',
      title: 'Updated Title',
      url: '/writing/repeat/',
      readTime: 6,
    });

    expect(result).toContain('Updated Title');
    expect(result).not.toContain('Original Title');
    expect(result.match(/data-slug="repeat"/g)).toHaveLength(1);
  });

  it('replaces an existing card for a slug containing HTML-special characters', () => {
    const withCard = insertWritingCard(BASE_HTML, {
      slug: 'foo&bar',
      tag: 'AI Agents',
      title: 'Original Title',
      url: '/writing/foo-bar/',
      readTime: 5,
    });

    const result = insertWritingCard(withCard, {
      slug: 'foo&bar',
      tag: 'AI Agents',
      title: 'Updated Title',
      url: '/writing/foo-bar/',
      readTime: 6,
    });

    expect(result).toContain('Updated Title');
    expect(result).not.toContain('Original Title');
    expect(result.match(/data-slug="foo&amp;bar"/g)).toHaveLength(1);
  });
});

function makeArticle(): Article {
  return {
    filePath: '/tmp/article.md',
    content: '# Heading\n\nA [link](https://example.com) and some *text*.\n',
    frontmatter: {
      title: 'My Article',
      slug: 'my-article',
      status: 'ready',
      tags: ['ai'],
      description: 'A description.',
      publishedAt: '2026-08-11T00:00:00.000Z',
      syndication: {
        substack: { status: 'pending', url: null },
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

describe('renderArticlePage', () => {
  it('renders the article markdown into the page body', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('<h1 class="article-title">My Article</h1>');
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<em>text</em>');
  });

  it('includes a canonical link and OG tags built from frontmatter', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain(
      '<link rel="canonical" href="https://joeblack.nyc/writing/my-article/" />',
    );
    expect(html).toContain('<meta property="og:title" content="My Article" />');
    expect(html).toContain('<meta property="og:description" content="A description." />');
  });

  it('HTML-escapes title and description', () => {
    const article = makeArticle();
    article.frontmatter.title = 'Title with <tags> & "quotes"';
    article.frontmatter.description = 'Desc with <tags>';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).not.toContain('<tags>');
    expect(html).toContain('&lt;tags&gt;');
  });

  it('references the shared stylesheet and theme module with page-relative paths', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('href="../../style.css"');
    expect(html).toContain("from '../../theme.js'");
  });

  it('HTML-escapes the canonical link href', () => {
    const article = makeArticle();
    article.frontmatter.slug = 'my-article-"onmouseover="alert(1)';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain(
      '<link rel="canonical" href="https://joeblack.nyc/writing/my-article-&quot;onmouseover=&quot;alert(1)/" />',
    );
    expect(html).not.toContain('href="https://joeblack.nyc/writing/my-article-"onmouseover="');
  });
});
