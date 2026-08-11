import type { ClipboardWriter } from './clipboard-publisher.js';
import type { LinkFormatter, PublishInput, PublishResult, Publisher } from './publisher.js';

export type UrlPrompt = (message: string) => Promise<string>;

function buildClipboardText(input: PublishInput): string {
  const backlink = `Originally published at ${input.articleUrl}`;
  return [input.articleContent, backlink].filter(Boolean).join('\n\n---\n\n');
}

export function createSubstackPublisher(
  clipboardWrite: ClipboardWriter,
  promptForUrl: UrlPrompt,
  newPostUrl: string,
  formatLink: LinkFormatter,
): Publisher {
  return {
    platform: 'substack',
    async publish(input: PublishInput): Promise<PublishResult> {
      await clipboardWrite(buildClipboardText(input));

      const url = await promptForUrl(
        `Copied article + backlink to clipboard — go to ${formatLink(newPostUrl, 'your Substack new-post page')} and paste it into a new post, publish it, then paste the resulting URL:`,
      );
      return { status: 'synced', url };
    },
  };
}
