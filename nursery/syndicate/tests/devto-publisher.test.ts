import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type DevtoPostClient,
  createDevtoPostClient,
  publishToDevto,
} from '../src/devto-publisher.js';

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

describe('createDevtoPostClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the article payload and parses the URL from a successful response', async () => {
    const fetchMock = vi.fn(async () => Response.json({ url: 'https://dev.to/joe/new' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createDevtoPostClient('secret-key');
    const result = await client.createArticle({
      title: 'New Post',
      bodyMarkdown: '# body',
      canonicalUrl: 'https://sub.example.com/p/new',
      tags: ['ai', 'agents'],
    });

    expect(result).toEqual({ url: 'https://dev.to/joe/new' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://dev.to/api/articles');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['api-key']).toBe('secret-key');
    const body = JSON.parse(init.body as string) as {
      article: Record<string, unknown>;
    };
    expect(body.article.title).toBe('New Post');
    expect(body.article.body_markdown).toBe('# body');
    expect(body.article.canonical_url).toBe('https://sub.example.com/p/new');
    expect(body.article.tags).toEqual(['ai', 'agents']);
  });

  it('strips hyphens and other non-alphanumeric characters from tags — dev.to rejects them', async () => {
    const fetchMock = vi.fn(async () => Response.json({ url: 'https://dev.to/joe/new' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createDevtoPostClient('secret-key');
    await client.createArticle({
      title: 'New Post',
      bodyMarkdown: '# body',
      canonicalUrl: 'https://sub.example.com/p/new',
      tags: ['claude-code', 'ai-agents', 'autonomous-agents'],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { article: Record<string, unknown> };
    expect(body.article.tags).toEqual(['claudecode', 'aiagents', 'autonomousagents']);
  });

  it('caps tags at 4 — dev.to rejects a longer list', async () => {
    const fetchMock = vi.fn(async () => Response.json({ url: 'https://dev.to/joe/new' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createDevtoPostClient('secret-key');
    await client.createArticle({
      title: 'New Post',
      bodyMarkdown: '# body',
      canonicalUrl: 'https://sub.example.com/p/new',
      tags: ['one', 'two', 'three', 'four', 'five', 'six'],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { article: Record<string, unknown> };
    expect(body.article.tags).toEqual(['one', 'two', 'three', 'four']);
  });

  it('throws an error that includes the response body when the publish request fails', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{"error":"title is required","status":422}', {
          status: 422,
          statusText: 'Unprocessable Entity',
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createDevtoPostClient('secret-key');

    await expect(
      client.createArticle({
        title: '',
        bodyMarkdown: '# body',
        canonicalUrl: 'https://sub.example.com/p/new',
        tags: [],
      }),
    ).rejects.toThrow(/422/);
    await expect(
      client.createArticle({
        title: '',
        bodyMarkdown: '# body',
        canonicalUrl: 'https://sub.example.com/p/new',
        tags: [],
      }),
    ).rejects.toThrow(/title is required/);
  });
});
