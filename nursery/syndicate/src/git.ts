import { execFile, execFileSync } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Resolves the top-level directory of the git repository containing `cwd`. Unlike
 * `process.cwd()`, this is correct regardless of which subdirectory a command is invoked
 * from — e.g. running from `nursery/syndicate/` still resolves to the outer repo root where
 * `private-content/` and `site/` actually live.
 */
export function resolveRepoRoot(cwd: string = process.cwd()): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- git is a fixed, trusted binary, same pattern as runGit below
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
}

export type GitExec = (args: string[], cwd: string) => Promise<void>;

export const runGit: GitExec = async (args, cwd) => {
  await execFileAsync('git', args, { cwd });
};

export async function commitAndPush(
  paths: string[],
  message: string,
  cwd: string,
  gitExec: GitExec = runGit,
): Promise<void> {
  await gitExec(['add', ...paths], cwd);
  await gitExec(['commit', '-m', message, '--', ...paths], cwd);
  await gitExec(['push'], cwd);
}

/**
 * Commits and pushes each path within its own containing git repository, so paths spanning a
 * submodule boundary (e.g. an article inside `private-content/`, a site file in the outer repo)
 * each land in the correct repo's history instead of one commit spuriously spanning both.
 */
export async function commitAndPushByRepo(
  paths: string[],
  message: string,
  gitExec: GitExec = runGit,
): Promise<void> {
  const groups = new Map<string, string[]>();
  for (const filePath of paths) {
    const repoRoot = resolveRepoRoot(path.dirname(filePath));
    const group = groups.get(repoRoot) ?? [];
    group.push(filePath);
    groups.set(repoRoot, group);
  }

  for (const [repoRoot, groupPaths] of groups) {
    await commitAndPush(groupPaths, message, repoRoot, gitExec);
  }
}
