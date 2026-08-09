import fg from 'fast-glob';
import { readArticle } from './frontmatter.js';
import type { Article } from './types.js';

export async function scanReadyArticles(articlesDir: string): Promise<Article[]> {
  const files = await fg('*.md', { cwd: articlesDir, absolute: true });
  const articles = await Promise.all(files.map((file) => readArticle(file)));
  return articles.filter((article) => article.frontmatter.status === 'ready');
}
