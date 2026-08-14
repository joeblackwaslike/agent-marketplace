import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { anthropic } from '@ai-sdk/anthropic';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { Output, generateText } from 'ai';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const draftSchema = z.object({
  // No hard length cap: a caption plus a full Substack URL routinely exceeds 280 characters, and
  // the model can't reliably hit that budget once the URL is included. A schema-validation
  // failure here would blow up the entire draft (including otherwise-fine linkedin/facebook
  // fields) over one field's length. Length is a soft target from voice.md's prompt guidance,
  // enforced for real at the human approval step (approve.ts) before anything gets posted.
  x: z.string(),
  linkedin: z.string(),
  facebook: z.string(),
  instagram: z.string(),
  website: z.object({ tag: z.string() }),
});

export type Draft = z.infer<typeof draftSchema>;

export type DraftModel = {
  generate: (prompt: string) => Promise<Draft>;
};

export function getClaudeBackend(): 'oauth' | 'api-key' {
  return process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'oauth' : 'api-key';
}

/**
 * query() spawns the `claude` CLI as a subprocess, and Claude Code's own auth precedence ranks
 * ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN above CLAUDE_CODE_OAUTH_TOKEN. Since ANTHROPIC_API_KEY
 * stays in .env as the api-key backend's own credential, it must be stripped from the
 * subprocess env here or `query()` silently falls back to the (exhausted) billed key instead of
 * the subscription token.
 */
function subprocessEnv(): Record<string, string | undefined> {
  const env = { ...process.env };
  // biome-ignore lint/performance/noDelete: env is a plain-object copy, not process.env itself
  delete env.ANTHROPIC_API_KEY;
  // biome-ignore lint/performance/noDelete: env is a plain-object copy, not process.env itself
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

export function createOauthDraftModel(): DraftModel {
  return {
    async generate(prompt: string) {
      let structuredOutput: unknown;
      for await (const message of query({
        prompt,
        options: {
          tools: [],
          maxTurns: 1,
          model: 'claude-sonnet-5',
          outputFormat: { type: 'json_schema', schema: z.toJSONSchema(draftSchema) },
          env: subprocessEnv(),
        },
      })) {
        if (message.type === 'result') {
          if (message.subtype === 'success') {
            structuredOutput = message.structured_output;
          }
          break;
        }
      }

      if (structuredOutput === undefined) {
        throw new Error('draft.ts: oauth backend did not return a structured_output result');
      }
      return draftSchema.parse(structuredOutput);
    },
  };
}

function createApiKeyDraftModel(): DraftModel {
  return {
    async generate(prompt: string) {
      const { output } = await generateText({
        model: anthropic('claude-sonnet-5'),
        output: Output.object({ schema: draftSchema }),
        prompt,
      });
      return output;
    },
  };
}

export function createClaudeDraftModel(): DraftModel {
  return getClaudeBackend() === 'oauth' ? createOauthDraftModel() : createApiKeyDraftModel();
}

export async function buildDraftPrompt(
  articleContent: string,
  articleUrl: string,
): Promise<string> {
  const voiceGuide = await readFile(path.join(__dirname, 'voice.md'), 'utf8');
  return [voiceGuide, '---', `Article URL: ${articleUrl}`, '---', articleContent].join('\n\n');
}

export async function draftCaptions(
  model: DraftModel,
  articleContent: string,
  articleUrl: string,
): Promise<Draft> {
  const prompt = await buildDraftPrompt(articleContent, articleUrl);
  return model.generate(prompt);
}
