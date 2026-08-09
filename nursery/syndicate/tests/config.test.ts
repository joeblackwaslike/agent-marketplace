import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

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
