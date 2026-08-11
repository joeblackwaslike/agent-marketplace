import type { LinkFormatter, PublishInput, PublishResult, Publisher } from './publisher.js';

export type UrlPrompt = (message: string) => Promise<string>;

const MEDIUM_NEW_STORY_URL = 'https://medium.com/new-story';

/**
 * Medium's medium.com/p/import feature strips headings, links, and other formatting from the
 * source article, so this stays a manual step: link to a fresh story draft, let the human
 * publish it there (pasting rendered content, not raw markdown), then record the resulting URL.
 */
export function createMediumPublisher(
  promptForUrl: UrlPrompt,
  formatLink: LinkFormatter,
): Publisher {
  return {
    platform: 'medium',
    async publish(input: PublishInput): Promise<PublishResult> {
      const url = await promptForUrl(
        `Go to ${formatLink(MEDIUM_NEW_STORY_URL, 'medium.com/new-story')} and publish "${input.articleTitle}" there (paste the rendered content, not the raw markdown), then paste the resulting URL:`,
      );
      return { status: 'synced', url };
    },
  };
}
