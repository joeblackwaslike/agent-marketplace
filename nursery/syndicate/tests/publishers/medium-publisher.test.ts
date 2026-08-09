import { describe, expect, it, vi } from 'vitest';
import { createMediumPublisher } from '../../src/publishers/medium-publisher.js';

describe('createMediumPublisher', () => {
  it('always copies the article URL, even if a caption is present, and confirms', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const publisher = createMediumPublisher(clipboardWrite, confirm);

    const result = await publisher.publish({
      articleTitle: 'T',
      articleUrl: 'https://sub.example.com/p/x',
      caption: 'should be ignored',
    });

    expect(clipboardWrite).toHaveBeenCalledWith('https://sub.example.com/p/x');
    expect(confirm).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'synced' });
  });
});
