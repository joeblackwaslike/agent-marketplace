import type { LinkFormatter, PublishInput, PublishResult, Publisher } from './publisher.js';

export type UrlPrompt = (message: string) => Promise<string>;

export function createSubstackPublisher(
  promptForUrl: UrlPrompt,
  newPostUrl: string,
  formatLink: LinkFormatter,
): Publisher {
  return {
    platform: 'substack',
    async publish(input: PublishInput): Promise<PublishResult> {
      const url = await promptForUrl(
        `Go to ${formatLink(newPostUrl, 'your Substack new-post page')} and paste "${input.articleTitle}" into a new post, publish it, then paste the resulting URL:`,
      );
      return { status: 'synced', url };
    },
  };
}
