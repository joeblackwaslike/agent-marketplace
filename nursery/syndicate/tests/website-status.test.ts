import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { isArticleOnWebsite } from '../src/website-status.js';

describe('isArticleOnWebsite', () => {
  let filePath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'syndicate-site-'));
    filePath = join(dir, 'index.html');
    await writeFile(
      filePath,
      `<div class="writing-list"><a href="https://sub.example.com/p/one">One</a></div>`,
      'utf8',
    );
  });

  it('returns true when the article URL is already linked', async () => {
    expect(await isArticleOnWebsite(filePath, 'https://sub.example.com/p/one')).toBe(true);
  });

  it('returns false when the article URL is not present', async () => {
    expect(await isArticleOnWebsite(filePath, 'https://sub.example.com/p/two')).toBe(false);
  });
});
