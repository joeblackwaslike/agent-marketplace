import type { Query } from '@anthropic-ai/claude-agent-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type Draft,
  type DraftModel,
  buildDraftPrompt,
  createOauthDraftModel,
  draftCaptions,
  draftSchema,
  getClaudeBackend,
} from '../src/draft.js';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: queryMock }));

type FakeResultMessage =
  // biome-ignore lint/style/useNamingConvention: mirrors the Agent SDK's SDKResultMessage field
  | { type: 'result'; subtype: 'success'; structured_output: unknown }
  | { type: 'result'; subtype: 'error_max_turns' };

function fakeQuery(message: FakeResultMessage): Query {
  async function* generator() {
    yield message;
  }
  return generator() as unknown as Query;
}

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

describe('getClaudeBackend', () => {
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: process.env.X = undefined sets the string "undefined", not a real deletion
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  });

  it('returns "oauth" when CLAUDE_CODE_OAUTH_TOKEN is set', () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'sk-ant-oat01-test';
    expect(getClaudeBackend()).toBe('oauth');
  });

  it('returns "api-key" when CLAUDE_CODE_OAUTH_TOKEN is unset', () => {
    expect(getClaudeBackend()).toBe('api-key');
  });
});

describe('createOauthDraftModel', () => {
  afterEach(() => {
    queryMock.mockReset();
  });

  it('returns the structured_output from a successful query() result', async () => {
    const fixture: Draft = {
      x: 'One sharp line. https://sub.example.com/p/x',
      linkedin: 'Longer take.',
      facebook: 'Narrative take.',
      instagram: 'Punchy line.\n\nLink in bio.',
      website: { tag: 'AI Agents' },
    };
    queryMock.mockReturnValue(
      // biome-ignore lint/style/useNamingConvention: mirrors the Agent SDK's SDKResultMessage field
      fakeQuery({ type: 'result', subtype: 'success', structured_output: fixture }),
    );

    const model = createOauthDraftModel();
    const result = await model.generate('prompt text');

    expect(result).toEqual(fixture);
  });

  it('throws when query() completes without a structured_output', async () => {
    queryMock.mockReturnValue(fakeQuery({ type: 'result', subtype: 'error_max_turns' }));

    const model = createOauthDraftModel();

    await expect(model.generate('prompt text')).rejects.toThrow();
  });
});
