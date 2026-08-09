import { readFile, writeFile } from 'node:fs/promises';
import matter, { stringify } from 'gray-matter';
import type { Article, Frontmatter } from './types.js';

export async function readArticle(filePath: string): Promise<Article> {
  const raw = await readFile(filePath, 'utf8');
  const parsed = matter(raw);
  return {
    filePath,
    frontmatter: parsed.data as Frontmatter,
    content: parsed.content,
  };
}

export async function writeArticleFrontmatter(article: Article): Promise<void> {
  const output = stringify(article.content, article.frontmatter);
  await writeFile(article.filePath, output, 'utf8');
}
