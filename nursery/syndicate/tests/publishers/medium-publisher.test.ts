import { describe, expect, it, vi } from 'vitest';
import { createMediumPublisher } from '../../src/publishers/medium-publisher.js';

describe('createMediumPublisher', () => {
  it('always copies the article URL, even if a caption is present, and confirms', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const formatLink = vi.fn((url: string) => url);
    const publisher = createMediumPublisher(clipboardWrite, confirm, formatLink);

    const result = await publisher.publish({
      articleTitle: 'T',
      articleUrl: 'https://sub.example.com/p/x',
      caption: 'should be ignored',
    });

    // The article URL is what's on the clipboard to paste — it doesn't need to be clickable,
    // clicking it just reopens the Substack post. The thing that needs to be clickable is the
    // destination you navigate TO: Medium's import page.
    expect(clipboardWrite).toHaveBeenCalledWith('https://sub.example.com/p/x');
    expect(formatLink).toHaveBeenCalledWith('https://medium.com/p/import', expect.any(String));
    expect(confirm).toHaveBeenCalledOnce();
    const [message] = confirm.mock.calls[0] as [string];
    expect(message).toContain('https://sub.example.com/p/x');
    expect(result).toEqual({ status: 'synced' });
  });
});
