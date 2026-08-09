import type { PublishInput, PublishResult, Publisher } from './publisher.js';

export type UrlPrompt = (message: string) => Promise<string>;

export function createSubstackPublisher(promptForUrl: UrlPrompt): Publisher {
  return {
    platform: 'substack',
    async publish(input: PublishInput): Promise<PublishResult> {
      console.log(`Paste "${input.articleTitle}" into a new Substack post and publish it.`);
      const url = await promptForUrl('Paste the resulting Substack URL:');
      return { status: 'synced', url };
    },
  };
}
