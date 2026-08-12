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
    content:
      '# My Article\n\n## A subtitle deck\n\nA [link](https://example.com) and some *text*.\n\n## Second Section\n\nMore body text.\n',
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
        instagram: { status: 'pending' },
      },
    },
  };
}

describe('renderArticlePage', () => {
  it('strips the leading title heading and renders the rest of the markdown into the page body', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('<h1 class="article-title">My Article</h1>');
    expect(html).not.toContain('<h1>My Article</h1>');
    expect(html).toContain('<h2>A subtitle deck</h2>');
    expect(html).toContain('<h2>Second Section</h2>');
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<em>text</em>');
  });

  it('strips only the leading title heading, not a heading later in the body', () => {
    const article = makeArticle();
    article.content = '# My Article\n\nBody text.\n\n# Not a title\n\nMore text.\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    const h1Count = (html.match(/<h1[ >]/g) ?? []).length;
    expect(h1Count).toBe(2);
    expect(html).toContain('<h1 class="article-title">My Article</h1>');
    expect(html).toContain('<h1>Not a title</h1>');
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

describe('renderArticlePage — CTAs', () => {
  it('renders a CTA card in place of its marker comment', () => {
    const article = makeArticle();
    article.content =
      'Intro paragraph.\n\n<!-- cta: {"copy": "Subscribe for more.", "actionLabel": "Subscribe", "actionUrl": "https://joeblackwaslike.substack.com/subscribe"} -->\n\n## Next section\n\nMore text.\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('class="cta-card"');
    expect(html).toContain('Subscribe for more.');
    expect(html).toContain('href="https://joeblackwaslike.substack.com/subscribe"');
    expect(html).not.toContain('<!-- cta:');
  });

  it('renders a marker placed as the last block in the content, after everything else', () => {
    const article = makeArticle();
    article.content =
      'Intro paragraph.\n\n## Closing thoughts\n\nFinal words.\n\n<!-- cta: {"copy": "One more thing.", "actionLabel": "Subscribe", "actionUrl": "https://joeblackwaslike.substack.com/subscribe"} -->\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html.indexOf('Final words.')).toBeLessThan(html.indexOf('One more thing.'));
  });

  it('renders multiple distinct CTAs in document order', () => {
    const article = makeArticle();
    article.content =
      '<!-- cta: {"copy": "First CTA.", "actionLabel": "Go", "actionUrl": "https://example.com/a"} -->\n\n## Section\n\n<!-- cta: {"copy": "Second CTA.", "actionLabel": "Go", "actionUrl": "https://example.com/b"} -->\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html.indexOf('First CTA.')).toBeLessThan(html.indexOf('Second CTA.'));
    expect((html.match(/class="cta-card"/g) ?? []).length).toBe(2);
  });

  it('leaves a malformed (invalid JSON) marker untouched, as an inert comment, without throwing', () => {
    const article = makeArticle();
    article.content = 'Intro.\n\n<!-- cta: {not valid json} -->\n\nMore text.\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('<!-- cta: {not valid json} -->');
    expect(html).not.toContain('class="cta-card"');
  });

  it('leaves a marker missing a required field untouched, as an inert comment', () => {
    const article = makeArticle();
    article.content =
      'Intro.\n\n<!-- cta: {"copy": "Missing fields.", "actionLabel": "Go"} -->\n\nMore text.\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).not.toContain('class="cta-card"');
    expect(html).toContain('<!-- cta:');
  });

  it('renders a payload with extra, unknown fields', () => {
    const article = makeArticle();
    article.content =
      '<!-- cta: {"copy": "Extra fields.", "actionLabel": "Go", "actionUrl": "https://example.com", "unknown": "ignored"} -->\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('class="cta-card"');
    expect(html).toContain('Extra fields.');
  });

  it('HTML-escapes CTA copy, actionLabel, and actionUrl, including an XSS-style injection attempt', () => {
    const article = makeArticle();
    const payload = JSON.stringify({
      copy: 'Subscribe <script>alert(1)</script> now',
      actionLabel: 'Go & <b>now</b>',
      actionUrl: 'https://example.com/"onmouseover="alert(1)',
    });
    article.content = `<!-- cta: ${payload} -->\n`;

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('"onmouseover="alert(1)');
    expect(html).toContain('&quot;onmouseover=');
    expect(html).toContain('&amp;');
  });

  it('parses correctly when copy text contains a literal closing brace', () => {
    const article = makeArticle();
    article.content =
      '<!-- cta: {"copy": "Everything you need {and more}.", "actionLabel": "Go", "actionUrl": "https://example.com"} -->\n';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('class="cta-card"');
    expect(html).toContain('Everything you need {and more}.');
  });

  it('renders no CTA cards when the article has no markers', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).not.toContain('class="cta-card"');
  });
});

describe('renderArticlePage — share links', () => {
  it('includes X and LinkedIn share links built from the title and canonical URL', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');
    const canonicalUrl = 'https://joeblack.nyc/writing/my-article/';

    expect(html).toContain(
      `href="https://x.com/intent/post?text=${encodeURIComponent('My Article')}&amp;url=${encodeURIComponent(canonicalUrl)}"`,
    );
    expect(html).toContain(
      `href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}"`,
    );
  });

  it('includes a copy-link button wired to the canonical URL via the clipboard API', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('id="copy-link-btn"');
    expect(html).toContain('data-url="https://joeblack.nyc/writing/my-article/"');
    expect(html).toContain('navigator.clipboard.writeText');
  });

  it('HTML-escapes a title with special characters used to build the X share intent', () => {
    const article = makeArticle();
    article.frontmatter.title = 'Fish & Chips "Recipe"';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    const expectedText = encodeURIComponent('Fish & Chips "Recipe"');
    expect(html).toContain(`text=${expectedText}`);
    expect(html).not.toContain('text=Fish & Chips');
  });
});

describe('renderArticlePage — giscus embed', () => {
  it('includes a giscus mount point and client script with the configured repo and theme', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('<div class="giscus"></div>');
    expect(html).toContain('src="https://giscus.app/client.js"');
    expect(html).toContain('data-repo="joeblackwaslike/agent-marketplace"');
    expect(html).toContain('data-theme="preferred_color_scheme"');
    expect(html).toMatch(/data-repo-id="[^"]+"/);
    expect(html).toMatch(/data-category-id="[^"]+"/);
  });
});
