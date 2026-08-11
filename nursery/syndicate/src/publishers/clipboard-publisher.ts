import type { LinkFormatter, PublishInput, PublishResult, Publisher } from './publisher.js';

export type ClipboardWriter = (text: string) => Promise<void>;
export type ConfirmPrompt = (message: string) => Promise<void>;
export type DestinationLink = { url: string; label: string };
export type DestinationLinkBuilder = (text: string) => DestinationLink;

export function createClipboardPublisher(
  platform: string,
  clipboardWrite: ClipboardWriter,
  confirm: ConfirmPrompt,
  formatLink: LinkFormatter,
  buildDestinationLink: DestinationLinkBuilder,
): Publisher {
  return {
    platform,
    async publish(input: PublishInput): Promise<PublishResult> {
      const text = input.caption ?? input.articleUrl;
      await clipboardWrite(text);
      const { url, label } = buildDestinationLink(text);
      await confirm(
        `Copied to clipboard — go to ${formatLink(url, label)} and paste, then press Enter to confirm:\n\n${text}\n`,
      );
      return { status: 'synced' };
    },
  };
}

export async function defaultClipboardWrite(text: string): Promise<void> {
  const { default: clipboardy } = await import('clipboardy');
  await clipboardy.write(text);
}
