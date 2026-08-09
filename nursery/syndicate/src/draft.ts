import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { anthropic } from '@ai-sdk/anthropic';
import { Output, generateText } from 'ai';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const X_MAX_LENGTH = 280;

export const draftSchema = z.object({
  x: z.string().max(X_MAX_LENGTH),
  linkedin: z.string(),
  facebook: z.string(),
  website: z.object({ tag: z.string() }),
});

export type Draft = z.infer<typeof draftSchema>;

export type DraftModel = {
  generate: (prompt: string) => Promise<Draft>;
};

export function createClaudeDraftModel(): DraftModel {
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
