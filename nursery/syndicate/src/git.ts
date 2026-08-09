import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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
  await gitExec(['commit', '-m', message], cwd);
  await gitExec(['push'], cwd);
}
