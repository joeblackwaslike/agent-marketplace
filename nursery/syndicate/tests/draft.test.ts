import { describe, expect, it } from 'vitest';
import {
  type Draft,
  type DraftModel,
  buildDraftPrompt,
  draftCaptions,
  draftSchema,
} from '../src/draft.js';

describe('draftCaptions', () => {
  it("passes the model's structured output straight through", async () => {
    const fixture: Draft = {
      x: 'One sharp line. https://sub.example.com/p/x',
      linkedin: 'Longer take.',
      facebook: 'Narrative take.',
      instagram: 'Punchy line.\n\nLink in bio.',
      website: { tag: 'AI Agents' },
    };
    const model: DraftModel = { generate: async () => fixture };

    const result = await draftCaptions(model, 'article body', 'https://sub.example.com/p/x');
    expect(result).toEqual(fixture);
  });
});

describe('draftSchema', () => {
  it('accepts an x caption longer than 280 characters', () => {
    // A caption plus a full Substack URL routinely exceeds 280 characters. This must not be a
    // hard schema-validation failure — length is a soft target enforced by voice.md's prompt
    // guidance and by the human approval step (approve.ts) before anything is posted, not a
    // structured-output constraint that can blow up the entire draft (including the otherwise-fine
    // linkedin/facebook fields) over one field's length.
    const longX = `${'x'.repeat(250)} https://joeblackwaslike.substack.com/p/i-thought-id-lost-the-plot-i-was`;
    expect(longX.length).toBeGreaterThan(280);

    const result = draftSchema.safeParse({
      x: longX,
      linkedin: 'Longer take.',
      facebook: 'Narrative take.',
      instagram: 'Punchy line.\n\nLink in bio.',
      website: { tag: 'AI Agents' },
    });

    expect(result.success).toBe(true);
  });
});

describe('buildDraftPrompt', () => {
  it('includes the article URL and content', async () => {
    const prompt = await buildDraftPrompt('article body text', 'https://sub.example.com/p/x');
    expect(prompt).toContain('https://sub.example.com/p/x');
    expect(prompt).toContain('article body text');
  });
});
