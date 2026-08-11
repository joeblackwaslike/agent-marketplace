import { access } from 'node:fs/promises';
import path from 'node:path';

export async function isArticleOnWebsite(siteIndexPath: string, slug: string): Promise<boolean> {
  const pagePath = path.join(path.dirname(siteIndexPath), 'writing', slug, 'index.html');
  try {
    await access(pagePath);
    return true;
  } catch {
    return false;
  }
}
