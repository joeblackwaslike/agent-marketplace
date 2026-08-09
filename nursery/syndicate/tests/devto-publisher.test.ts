import { describe, expect, it, vi } from 'vitest';
import { type DevtoPostClient, publishToDevto } from '../src/devto-publisher.js';

describe('publishToDevto', () => {
  it('passes canonical_url, tags, and markdown body through to the client', async () => {
    const createArticle = vi.fn(async () => ({ url: 'https://dev.to/joe/new' }));
    const client: DevtoPostClient = { createArticle };

    const url = await publishToDevto(client, {
      title: 'New Post',
      bodyMarkdown: '# body',
      canonicalUrl: 'https://sub.example.com/p/new',
      tags: ['ai', 'agents'],
    });

    expect(url).toBe('https://dev.to/joe/new');
    expect(createArticle).toHaveBeenCalledWith({
      title: 'New Post',
      bodyMarkdown: '# body',
      canonicalUrl: 'https://sub.example.com/p/new',
      tags: ['ai', 'agents'],
    });
  });
});
