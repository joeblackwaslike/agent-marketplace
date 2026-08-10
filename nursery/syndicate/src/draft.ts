import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { anthropic } from '@ai-sdk/anthropic';
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
