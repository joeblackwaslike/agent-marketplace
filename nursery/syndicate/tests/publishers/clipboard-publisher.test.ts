import { describe, expect, it, vi } from 'vitest';
import { createClipboardPublisher } from '../../src/publishers/clipboard-publisher.js';

describe('createClipboardPublisher', () => {
  it('copies the caption, links to the built destination, and confirms', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const formatLink = vi.fn((url: string) => url);
    const buildDestinationLink = vi.fn((text: string) => ({
      url: `https://x.example.com/compose?text=${encodeURIComponent(text)}`,
      label: 'x.example.com',
    }));
    const publisher = createClipboardPublisher(
      'x',
      clipboardWrite,
      confirm,
      formatLink,
      buildDestinationLink,
    );

    const result = await publisher.publish({
      articleTitle: 'T',
      articleUrl: 'https://sub.example.com/p/x',
      caption: 'One sharp line.',
    });

    // The caption is what's on the clipboard to paste — it doesn't need to be clickable. The
    // thing that needs to be clickable is the destination you navigate TO: the compose page.
    expect(clipboardWrite).toHaveBeenCalledWith('One sharp line.');
    expect(buildDestinationLink).toHaveBeenCalledWith('One sharp line.');
    expect(formatLink).toHaveBeenCalledWith(
      'https://x.example.com/compose?text=One%20sharp%20line.',
      'x.example.com',
    );
    expect(confirm).toHaveBeenCalledOnce();
    const [message] = confirm.mock.calls[0] as [string];
    expect(message).toContain('One sharp line.');
    expect(result).toEqual({ status: 'synced' });
  });

  it('falls back to the article URL when no caption is given', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const formatLink = vi.fn((url: string) => url);
    const buildDestinationLink = vi.fn((text: string) => ({ url: text, label: text }));
    const publisher = createClipboardPublisher(
      'x',
      clipboardWrite,
      confirm,
      formatLink,
      buildDestinationLink,
    );

    await publisher.publish({ articleTitle: 'T', articleUrl: 'https://sub.example.com/p/x' });

    expect(clipboardWrite).toHaveBeenCalledWith('https://sub.example.com/p/x');
  });
});
