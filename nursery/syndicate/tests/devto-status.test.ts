import { describe, expect, it } from 'vitest';
import { type DevtoClient, isArticleOnDevto } from '../src/devto-status.js';

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
