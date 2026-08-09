import { describe, expect, it, vi } from 'vitest';
import { createSubstackPublisher } from '../../src/publishers/substack-publisher.js';

describe('createSubstackPublisher', () => {
  it('prompts for the resulting URL and returns it', async () => {
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const publisher = createSubstackPublisher(promptForUrl);

    const result = await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: '',
    });

    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'synced', url: 'https://sub.example.com/p/new' });
  });
});
