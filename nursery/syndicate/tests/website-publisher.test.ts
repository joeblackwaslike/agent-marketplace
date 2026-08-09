import { describe, expect, it } from 'vitest';
import { insertWritingCard } from '../src/website-publisher.js';

const BASE_HTML = `<section><div class="writing-list"><article>existing</article></div></section>`;

describe('insertWritingCard', () => {
  it('inserts a new card right after the writing-list marker', () => {
    const result = insertWritingCard(BASE_HTML, {
      tag: 'AI Agents',
      title: 'New Post',
      url: 'https://sub.example.com/p/new',
      readTime: 5,
    });

    expect(result).toContain('<span class="writing-tag">AI Agents</span>');
    expect(result).toContain('href="https://sub.example.com/p/new"');
    expect(result).toContain('5 min read');
    expect(result.indexOf('New Post')).toBeLessThan(result.indexOf('existing'));
  });

  it('HTML-escapes title and tag', () => {
    const result = insertWritingCard(BASE_HTML, {
      tag: '<script>',
      title: 'Title with "quotes" & <tags>',
      url: 'https://sub.example.com/p/x',
      readTime: 1,
    });

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&lt;tags&gt;');
  });

  it('HTML-escapes quotes and apostrophes, including a quote-injection attempt in url', () => {
    const result = insertWritingCard(BASE_HTML, {
      tag: 'AI Agents',
      title: 'It\'s a "great" post',
      url: 'https://sub.example.com/p/x?a="onclick="alert(1)',
      readTime: 1,
    });

    expect(result).toContain('&quot;');
    expect(result).toContain('&#39;');
    expect(result).not.toContain('"onclick="alert(1)');
    expect(result).toContain('href="https://sub.example.com/p/x?a=&quot;onclick=&quot;alert(1)"');
  });

  it('throws when the writing-list marker is missing', () => {
    expect(() =>
      insertWritingCard('<div>no marker</div>', {
        tag: 'x',
        title: 'y',
        url: 'z',
        readTime: 1,
      }),
    ).toThrow(/writing-list/);
  });
});
