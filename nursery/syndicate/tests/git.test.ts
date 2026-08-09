import { describe, expect, it, vi } from 'vitest';
import { commitAndPush } from '../src/git.js';

describe('commitAndPush', () => {
  it('runs add, commit, push in order with the given paths and message', async () => {
    const calls: string[][] = [];
    const gitExec = vi.fn(async (args: string[]) => {
      calls.push(args);
    });

    await commitAndPush(['a.md', 'b.html'], 'chore: sync', '/repo', gitExec);

    expect(calls).toEqual([
      ['add', 'a.md', 'b.html'],
      ['commit', '-m', 'chore: sync', '--', 'a.md', 'b.html'],
      ['push'],
    ]);
    expect(gitExec).toHaveBeenCalledTimes(3);
  });
});
