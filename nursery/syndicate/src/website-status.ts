import { readFile } from 'node:fs/promises';

export async function isArticleOnWebsite(
  siteIndexPath: string,
  articleUrl: string,
): Promise<boolean> {
  const html = await readFile(siteIndexPath, 'utf8');
  return html.includes(`href="${articleUrl}"`);
}
