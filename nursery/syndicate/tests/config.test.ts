import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, loadDotEnv } from '../src/config.js';

describe('loadConfig', () => {
  it('parses a valid env', () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'sk-ant-test',
      DEVTO_API_KEY: 'devto-test',
    });
    expect(config.ARTICLES_DIR).toBe('private-content/drafts/articles');
    expect(config.SITE_INDEX_PATH).toBe('site/index.html');
  });

  it('throws when ANTHROPIC_API_KEY is missing', () => {
    expect(() => loadConfig({ DEVTO_API_KEY: 'devto-test' })).toThrow();
  });
});

describe('loadDotEnv', () => {
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: process.env.X = undefined sets the string "undefined", not a real deletion
    delete process.env.SYNDICATE_TEST_VAR;
  });

  it('loads variables from an existing .env file into process.env', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'syndicate-dotenv-'));
    const envPath = join(dir, '.env');
    await writeFile(envPath, 'SYNDICATE_TEST_VAR=hello\n', 'utf8');

    loadDotEnv(envPath);

    expect(process.env.SYNDICATE_TEST_VAR).toBe('hello');
  });

  it('does nothing when the file does not exist', () => {
    expect(() => loadDotEnv('/nonexistent/path/.env')).not.toThrow();
    expect(process.env.SYNDICATE_TEST_VAR).toBeUndefined();
  });
});
