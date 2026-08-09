import { describe, expect, it, vi } from 'vitest';
import { createClipboardPublisher } from '../../src/publishers/clipboard-publisher.js';

describe('createClipboardPublisher', () => {
  it('copies the caption when present, waits for confirmation, and reports synced', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const publisher = createClipboardPublisher('x', clipboardWrite, confirm);

    const result = await publisher.publish({
      articleTitle: 'T',
      articleUrl: 'https://sub.example.com/p/x',
      caption: 'One sharp line.',
    });

    expect(clipboardWrite).toHaveBeenCalledWith('One sharp line.');
    expect(confirm).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'synced' });
  });

  it('falls back to the article URL when no caption is given', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const publisher = createClipboardPublisher('x', clipboardWrite, confirm);

    await publisher.publish({ articleTitle: 'T', articleUrl: 'https://sub.example.com/p/x' });

    expect(clipboardWrite).toHaveBeenCalledWith('https://sub.example.com/p/x');
  });
});
