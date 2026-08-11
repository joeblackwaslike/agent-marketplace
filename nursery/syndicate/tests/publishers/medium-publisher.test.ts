import { describe, expect, it, vi } from 'vitest';
import { createMediumPublisher } from '../../src/publishers/medium-publisher.js';

describe('createMediumPublisher', () => {
  it('links to a new Medium story, prompts for the resulting URL, and returns it', async () => {
    const promptForUrl = vi.fn(async () => 'https://medium.com/@joe/new-story-abc123');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createMediumPublisher(promptForUrl, formatLink);

    const result = await publisher.publish({
      articleTitle: 'T',
      articleUrl: 'https://sub.example.com/p/x',
      caption: 'should be ignored',
    });

    // Medium's URL-import feature (medium.com/p/import) strips headings, links, and other
    // formatting from the source article, so publishing there has to stay a manual step —
    // this only links to a fresh story draft and records the URL once you're done.
    expect(formatLink).toHaveBeenCalledWith('https://medium.com/new-story', expect.any(String));
    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(promptForUrl).toHaveBeenCalledWith(expect.stringContaining('T'));
    expect(result).toEqual({ status: 'synced', url: 'https://medium.com/@joe/new-story-abc123' });
  });
});
