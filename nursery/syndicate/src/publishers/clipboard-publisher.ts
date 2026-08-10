import type { PublishInput, PublishResult, Publisher } from './publisher.js';

export type ClipboardWriter = (text: string) => Promise<void>;
export type ConfirmPrompt = (message: string) => Promise<void>;

export function createClipboardPublisher(
  platform: string,
  clipboardWrite: ClipboardWriter,
  confirm: ConfirmPrompt,
): Publisher {
  return {
    platform,
    async publish(input: PublishInput): Promise<PublishResult> {
      const text = input.caption ?? input.articleUrl;
      await clipboardWrite(text);
      await confirm(
        `Copied to clipboard — paste into ${platform} now, then press Enter to confirm:\n\n${text}\n`,
      );
      return { status: 'synced' };
    },
  };
}

export async function defaultClipboardWrite(text: string): Promise<void> {
  const { default: clipboardy } = await import('clipboardy');
  await clipboardy.write(text);
}
