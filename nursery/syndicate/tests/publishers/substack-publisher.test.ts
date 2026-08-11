import { describe, expect, it, vi } from 'vitest';
import { createSubstackPublisher } from '../../src/publishers/substack-publisher.js';

describe('createSubstackPublisher', () => {
  it('copies the article content plus a backlink, links to the new-post page, and returns the resulting URL', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createSubstackPublisher(
      clipboardWrite,
      promptForUrl,
      'https://joeblackwaslike.substack.com/publish',
      formatLink,
    );

    const result = await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: 'https://joeblack.nyc/writing/new-post/',
      articleContent: 'The full article body.',
    });

    expect(clipboardWrite).toHaveBeenCalledWith(
      'The full article body.\n\n---\n\nOriginally published at https://joeblack.nyc/writing/new-post/',
    );
    expect(formatLink).toHaveBeenCalledWith(
      'https://joeblackwaslike.substack.com/publish',
      expect.any(String),
    );
    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'synced', url: 'https://sub.example.com/p/new' });
  });

  it('copies just the backlink when no article content is given', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createSubstackPublisher(
      clipboardWrite,
      promptForUrl,
      'https://joeblackwaslike.substack.com/publish',
      formatLink,
    );

    await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: 'https://joeblack.nyc/writing/new-post/',
    });

    expect(clipboardWrite).toHaveBeenCalledWith(
      '\n\n---\n\nOriginally published at https://joeblack.nyc/writing/new-post/',
    );
  });
});
