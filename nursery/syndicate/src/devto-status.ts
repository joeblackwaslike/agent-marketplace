export type DevtoArticleSummary = {
  // biome-ignore lint/style/useNamingConvention: dev.to API response field
  canonical_url: string | null;
  url: string;
};

export type DevtoClient = {
  listMyArticles: () => Promise<DevtoArticleSummary[]>;
};

export async function isArticleOnDevto(
  client: DevtoClient,
  canonicalUrl: string,
): Promise<string | null> {
  const articles = await client.listMyArticles();
  const match = articles.find((article) => article.canonical_url === canonicalUrl);
  return match ? match.url : null;
}

export function createDevtoClient(apiKey: string): DevtoClient {
  return {
    async listMyArticles() {
      const response = await fetch('https://dev.to/api/articles/me', {
        headers: { 'api-key': apiKey },
      });
      if (!response.ok) {
        throw new Error(`dev.to API error: ${response.status}`);
      }
      return (await response.json()) as DevtoArticleSummary[];
    },
  };
}
