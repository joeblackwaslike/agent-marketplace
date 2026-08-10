import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { commitAndPush, commitAndPushByRepo, resolveRepoRoot } from '../src/git.js';

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

describe('resolveRepoRoot', () => {
  it('resolves the top-level directory of a real git repository from a nested subdirectory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'syndicate-reporoot-'));
    execFileSync('git', ['init'], { cwd: dir });
    const nested = join(dir, 'a', 'b');
    await mkdir(nested, { recursive: true });

    const root = resolveRepoRoot(nested);

    expect(realpathSync(root)).toBe(realpathSync(dir));
  });
});

describe('commitAndPushByRepo', () => {
  it('groups paths by their containing git repo and commits each repo separately, e.g. a submodule', async () => {
    const outerDir = await mkdtemp(join(tmpdir(), 'syndicate-outer-'));
    execFileSync('git', ['init'], { cwd: outerDir });
    const outerFile = join(outerDir, 'site.html');
    await writeFile(outerFile, 'x', 'utf8');

    const innerDir = join(outerDir, 'submodule');
    await mkdir(innerDir);
    execFileSync('git', ['init'], { cwd: innerDir });
    const innerFile = join(innerDir, 'article.md');
    await writeFile(innerFile, 'y', 'utf8');

    const calls: Array<{ args: string[]; cwd: string }> = [];
    const gitExec = vi.fn(async (args: string[], cwd: string) => {
      calls.push({ args, cwd });
    });

    await commitAndPushByRepo([outerFile, innerFile], 'chore: sync', gitExec);

    const outerRoot = realpathSync(outerDir);
    const innerRoot = realpathSync(innerDir);
    const outerCalls = calls.filter((call) => call.cwd === outerRoot).map((call) => call.args);
    const innerCalls = calls.filter((call) => call.cwd === innerRoot).map((call) => call.args);

    expect(outerCalls).toEqual([
      ['add', outerFile],
      ['commit', '-m', 'chore: sync', '--', outerFile],
      ['push'],
    ]);
    expect(innerCalls).toEqual([
      ['add', innerFile],
      ['commit', '-m', 'chore: sync', '--', innerFile],
      ['push'],
    ]);
    expect(calls).toHaveLength(6);
  });
});
