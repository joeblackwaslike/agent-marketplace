import { existsSync } from 'node:fs';
import { config as loadEnvConfig } from 'dotenv';
import { z } from 'zod';

/**
 * Loads `path` into `process.env`, overriding any value already set in the shell. Node's native
 * `process.loadEnvFile` cannot do this — it silently skips keys that already exist, which means a
 * stray default `ANTHROPIC_API_KEY` (or similar) already present in the shell would silently win
 * over this project's own `.env`. A project's own `.env` must be authoritative for that project.
 */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) {
    loadEnvConfig({ path, override: true, quiet: true });
  }
}

const envSchema = z
  .object({
    // Either credential authenticates draftCaptions()'s Claude calls (see src/draft.ts):
    // ANTHROPIC_API_KEY bills the pay-per-token Messages API, CLAUDE_CODE_OAUTH_TOKEN routes
    // through a Claude Max/Pro subscription instead and takes precedence when both are set.
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    CLAUDE_CODE_OAUTH_TOKEN: z.string().min(1).optional(),
    DEVTO_API_KEY: z.string().min(1),
    SUBSTACK_SUBDOMAIN: z.string().min(1),
    SITE_BASE_URL: z.url(),
    ARTICLES_DIR: z.string().default('private-content/drafts/articles'),
    SITE_INDEX_PATH: z.string().default('site/index.html'),
  })
  .refine((env) => Boolean(env.ANTHROPIC_API_KEY) || Boolean(env.CLAUDE_CODE_OAUTH_TOKEN), {
    message: 'Either ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN is required',
    path: ['ANTHROPIC_API_KEY'],
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  return envSchema.parse(env);
}
