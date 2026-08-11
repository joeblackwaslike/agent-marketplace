import type { ClipboardWriter, ConfirmPrompt } from './clipboard-publisher.js';
import type { LinkFormatter, PublishInput, PublishResult, Publisher } from './publisher.js';

const MEDIUM_IMPORT_URL = 'https://medium.com/p/import';

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
        `Copied to clipboard — go to ${formatLink(MEDIUM_IMPORT_URL, 'medium.com/p/import')} and paste this URL, publish, then press Enter to confirm:\n\n${input.articleUrl}\n`,
      );
      return { status: 'synced' };
    },
  };
}
