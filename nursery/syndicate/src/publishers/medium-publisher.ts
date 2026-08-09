import type { ClipboardWriter, ConfirmPrompt } from './clipboard-publisher.js';
import type { PublishInput, PublishResult, Publisher } from './publisher.js';

export function createMediumPublisher(
  clipboardWrite: ClipboardWriter,
  confirm: ConfirmPrompt,
): Publisher {
  return {
    platform: 'medium',
    async publish(input: PublishInput): Promise<PublishResult> {
      await clipboardWrite(input.articleUrl);
      await confirm(
        'Paste this URL into medium.com/p/import, publish, then press Enter to confirm.',
      );
      return { status: 'synced' };
    },
  };
}
