import { readFile, writeFile } from 'node:fs/promises';
import matter from 'gray-matter';
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
  // eslint-disable-next-line import-x/no-named-as-default-member -- gray-matter is CJS (export =); `matter.stringify` is real at runtime despite the ESM-oriented lint rule flagging it
  const output = matter.stringify(article.content, article.frontmatter);
  await writeFile(article.filePath, output, 'utf8');
}
