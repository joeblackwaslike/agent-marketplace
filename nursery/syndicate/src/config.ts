import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DEVTO_API_KEY: z.string().min(1),
  ARTICLES_DIR: z.string().default('private-content/drafts/articles'),
  SITE_INDEX_PATH: z.string().default('site/index.html'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  return envSchema.parse(env);
}
