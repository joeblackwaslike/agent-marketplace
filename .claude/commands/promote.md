Promote a project from `projects/` into its own standalone GitHub repository.

**Arguments:** `$ARGUMENTS` — project name (directory under `projects/`).

## Steps

1. Read `projects/$ARGUMENTS/README.md` to understand the project and write a one-line description.
2. Create a new **public** GitHub repo `joeblackwaslike/$ARGUMENTS` with that description and relevant topics.
3. Copy `projects/$ARGUMENTS/` to `~/github/joeblackwaslike/$ARGUMENTS/`.
4. In the new directory: `git init -b main`, `git add .`, `git commit -m "feat: initial commit — promoted from agent-marketplace nursery"`, `git remote add origin git@github.com:joeblackwaslike/$ARGUMENTS.git`, `git push -u origin main`.
5. Update any `launchd/*.plist` `WorkingDirectory` paths from the `projects/` path to the new standalone path.
6. Find the tracking issue in `joeblackwaslike/agent-marketplace` for this project (search issues with title `[nursery] $ARGUMENTS`). Close it with a comment: "Promoted to https://github.com/joeblackwaslike/$ARGUMENTS".
7. Remove `projects/$ARGUMENTS/` from this repo.
8. Update `README.md` — move the project row to a **Graduated** section (or remove it) and note the new repo URL.
9. Stage and commit: `feat(projects): promote $ARGUMENTS to standalone repo`.
