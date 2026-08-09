import { describe, expect, it, vi } from 'vitest';
import { approveCaption } from '../src/approve.js';

describe('approveCaption', () => {
  it('shows the platform and draft, returning the (possibly edited) result', async () => {
    const editPrompt = vi.fn(async (_label: string, initial: string) => `${initial} (edited)`);

    const result = await approveCaption(editPrompt, 'x', 'Original draft.');

    expect(editPrompt).toHaveBeenCalledWith(
      'Review/edit the x caption (Enter to accept as-is):',
      'Original draft.',
    );
    expect(result).toBe('Original draft. (edited)');
  });
});
