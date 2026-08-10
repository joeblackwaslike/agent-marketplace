import type { ClipboardWriter, ConfirmPrompt } from './clipboard-publisher.js';
import type { PublishInput, PublishResult, Publisher } from './publisher.js';

export type LinkFormatter = (url: string, label?: string) => string;

export function createMediumPublisher(
  clipboardWrite: ClipboardWriter,
  confirm: ConfirmPrompt,
  formatLink: LinkFormatter,
): Publisher {
  return {
    platform: 'medium',
    async publish(input: PublishInput): Promise<PublishResult> {
      await clipboardWrite(input.articleUrl);
      await confirm(
        `Copied to clipboard — paste this URL into medium.com/p/import, publish, then press Enter to confirm:\n\n${formatLink(input.articleUrl)}\n`,
      );
      return { status: 'synced' };
    },
  };
}
