import { describe, expect, it, vi } from 'vitest';
import { createSubstackPublisher } from '../../src/publishers/substack-publisher.js';

describe('createSubstackPublisher', () => {
  it('links to the new-post page, prompts for the resulting URL, and returns it', async () => {
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createSubstackPublisher(
      promptForUrl,
      'https://joeblackwaslike.substack.com/publish',
      formatLink,
    );

    const result = await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: '',
    });

    expect(formatLink).toHaveBeenCalledWith(
      'https://joeblackwaslike.substack.com/publish',
      expect.any(String),
    );
    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(promptForUrl).toHaveBeenCalledWith(expect.stringContaining('New Post'));
    expect(result).toEqual({ status: 'synced', url: 'https://sub.example.com/p/new' });
  });

  it('ignores a caption if one happens to be present', async () => {
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createSubstackPublisher(
      promptForUrl,
      'https://joeblackwaslike.substack.com/publish',
      formatLink,
    );

    const result = await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: '',
      caption: 'should be ignored',
    });

    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(promptForUrl).not.toHaveBeenCalledWith(expect.stringContaining('should be ignored'));
    expect(result).toEqual({ status: 'synced', url: 'https://sub.example.com/p/new' });
  });
});
