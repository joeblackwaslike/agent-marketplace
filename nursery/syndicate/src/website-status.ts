import { access } from 'node:fs/promises';
import path from 'node:path';

export function resolveArticlePagePath(siteIndexPath: string, slug: string): string {
  return path.join(path.dirname(siteIndexPath), 'writing', slug, 'index.html');
}

export async function isArticleOnWebsite(siteIndexPath: string, slug: string): Promise<boolean> {
  const pagePath = resolveArticlePagePath(siteIndexPath, slug);
  try {
    await access(pagePath);
    return true;
  } catch {
    return false;
  }
}
