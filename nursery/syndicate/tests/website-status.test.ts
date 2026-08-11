import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { isArticleOnWebsite } from '../src/website-status.js';

describe('isArticleOnWebsite', () => {
  let siteIndexPath: string;
  let siteDir: string;

  beforeEach(async () => {
    siteDir = await mkdtemp(join(tmpdir(), 'syndicate-site-'));
    siteIndexPath = join(siteDir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
  });

  it('returns true when the article page exists on disk', async () => {
    await mkdir(join(siteDir, 'writing', 'my-slug'), { recursive: true });
    await writeFile(join(siteDir, 'writing', 'my-slug', 'index.html'), '<html></html>', 'utf8');

    expect(await isArticleOnWebsite(siteIndexPath, 'my-slug')).toBe(true);
  });

  it('returns false when the article page does not exist', async () => {
    expect(await isArticleOnWebsite(siteIndexPath, 'missing-slug')).toBe(false);
  });
});
