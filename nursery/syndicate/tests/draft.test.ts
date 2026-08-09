import { describe, expect, it } from 'vitest';
import { type Draft, type DraftModel, buildDraftPrompt, draftCaptions } from '../src/draft.js';

describe('draftCaptions', () => {
  it("passes the model's structured output straight through", async () => {
    const fixture: Draft = {
      x: 'One sharp line. https://sub.example.com/p/x',
      linkedin: 'Longer take.',
      facebook: 'Narrative take.',
      website: { tag: 'AI Agents' },
    };
    const model: DraftModel = { generate: async () => fixture };

    const result = await draftCaptions(model, 'article body', 'https://sub.example.com/p/x');
    expect(result).toEqual(fixture);
  });
});

describe('buildDraftPrompt', () => {
  it('includes the article URL and content', async () => {
    const prompt = await buildDraftPrompt('article body text', 'https://sub.example.com/p/x');
    expect(prompt).toContain('https://sub.example.com/p/x');
    expect(prompt).toContain('article body text');
  });
});
