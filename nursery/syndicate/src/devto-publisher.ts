export type DevtoPublishInput = {
  title: string;
  bodyMarkdown: string;
  canonicalUrl: string;
  tags: string[];
};

export type DevtoPostClient = {
  createArticle: (input: DevtoPublishInput) => Promise<{ url: string }>;
};

export async function publishToDevto(
  client: DevtoPostClient,
  input: DevtoPublishInput,
): Promise<string> {
  const result = await client.createArticle(input);
  return result.url;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

const DEVTO_MAX_TAGS = 4;

/** dev.to rejects tags containing hyphens or other non-alphanumeric characters. */
function sanitizeDevtoTag(tag: string): string {
  return tag.replaceAll(/[^a-zA-Z0-9]/g, '');
}

/** dev.to rejects more than 4 tags per article. */
function sanitizeDevtoTags(tags: string[]): string[] {
  return tags.slice(0, DEVTO_MAX_TAGS).map((tag) => sanitizeDevtoTag(tag));
}

export function createDevtoPostClient(apiKey: string): DevtoPostClient {
  return {
    async createArticle(input) {
      const response = await fetch('https://dev.to/api/articles', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          article: {
            title: input.title,
            // biome-ignore lint/style/useNamingConvention: dev.to API request field
            body_markdown: input.bodyMarkdown,
            published: true,
            // biome-ignore lint/style/useNamingConvention: dev.to API request field
            canonical_url: input.canonicalUrl,
            tags: sanitizeDevtoTags(input.tags),
          },
        }),
      });
      if (!response.ok) {
        const detail = await readErrorDetail(response);
        const suffix = detail ? ` — ${detail}` : '';
        throw new Error(`dev.to publish failed: ${response.status}${suffix}`);
      }
      const data = (await response.json()) as { url: string };
      return { url: data.url };
    },
  };
}
