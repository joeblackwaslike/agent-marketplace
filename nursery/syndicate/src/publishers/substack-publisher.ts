import type { PublishInput, PublishResult, Publisher } from './publisher.js';

export type UrlPrompt = (message: string) => Promise<string>;

export function createSubstackPublisher(promptForUrl: UrlPrompt): Publisher {
  return {
    platform: 'substack',
    async publish(input: PublishInput): Promise<PublishResult> {
      const url = await promptForUrl(
        `Paste "${input.articleTitle}" into a new Substack post, publish it, then paste the resulting URL:`,
      );
      return { status: 'synced', url };
    },
  };
}
