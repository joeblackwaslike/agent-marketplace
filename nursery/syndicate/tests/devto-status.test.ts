import { afterEach, describe, expect, it, vi } from 'vitest';
import { type DevtoClient, createDevtoClient, isArticleOnDevto } from '../src/devto-status.js';

describe('isArticleOnDevto', () => {
  const client: DevtoClient = {
    async listMyArticles() {
      return [
        // biome-ignore lint/style/useNamingConvention: dev.to API response field
        { canonical_url: 'https://sub.example.com/p/one', url: 'https://dev.to/joe/one' },
      ];
    },
  };

  it('returns the dev.to URL when a canonical_url match is found', async () => {
    expect(await isArticleOnDevto(client, 'https://sub.example.com/p/one')).toBe(
      'https://dev.to/joe/one',
    );
  });

  it('returns null when no match is found', async () => {
    expect(await isArticleOnDevto(client, 'https://sub.example.com/p/missing')).toBeNull();
  });
});

describe('createDevtoClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the api-key header and a large per_page, and parses the JSON body on success', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        // biome-ignore lint/style/useNamingConvention: dev.to API response field
        { canonical_url: 'https://sub.example.com/p/one', url: 'https://dev.to/joe/one' },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createDevtoClient('secret-key');
    const articles = await client.listMyArticles();

    expect(articles).toEqual([
      // biome-ignore lint/style/useNamingConvention: dev.to API response field
      { canonical_url: 'https://sub.example.com/p/one', url: 'https://dev.to/joe/one' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://dev.to/api/articles/me');
    const requestUrl = new URL(url);
    expect(Number(requestUrl.searchParams.get('per_page'))).toBeGreaterThanOrEqual(1000);
    expect((init.headers as Record<string, string>)['api-key']).toBe('secret-key');
  });

  it('throws an error that includes the response body when the request fails', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{"error":"invalid api key","status":401}', {
          status: 401,
          statusText: 'Unauthorized',
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createDevtoClient('bad-key');

    await expect(client.listMyArticles()).rejects.toThrow(/401/);
    await expect(client.listMyArticles()).rejects.toThrow(/invalid api key/);
  });
});
