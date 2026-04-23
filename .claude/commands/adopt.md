Adopt a local directory into this repo as a new incubating project under `projects/`.

**Arguments:** `$ARGUMENTS` — absolute path to the local repo/directory to adopt.

## Steps

1. Derive `PROJECT_NAME` from the basename of `$ARGUMENTS`.
2. **Check for an existing GitHub repo** — run `gh repo view joeblackwaslike/$PROJECT_NAME` to see if a repo exists.
   - If it exists: note its description, star count, and URL for use in later steps.
3. Rsync content from `$ARGUMENTS/` into `projects/$PROJECT_NAME/`, excluding: `.venv/`, `__pycache__/`, `*.egg-info/`, `.git/`, `node_modules/`, `.superpowers/`.
4. If any `projects/$PROJECT_NAME/launchd/*.plist` files exist, update `WorkingDirectory` values from the original path to the new path (`$PWD/projects/$PROJECT_NAME`).
5. Read `projects/$PROJECT_NAME/README.md` (or infer from source files) to understand what the project does.
6. **If an existing GitHub repo was found:**
   - Prepend a deprecation notice to the original repo's README via `gh api` or MCP, pointing to `https://github.com/joeblackwaslike/agent-marketplace/tree/main/projects/$PROJECT_NAME`.
   - Archive the original repo: `gh repo archive joeblackwaslike/$PROJECT_NAME --yes`.
   - Note the original repo URL so the tracking issue can reference it.
7. Create a GitHub issue in `joeblackwaslike/agent-marketplace` with title `[nursery] $PROJECT_NAME`. Include:
   - What the project does
   - Link to `projects/$PROJECT_NAME/` in this repo
   - If migrated from a standalone repo: "Adopted from https://github.com/joeblackwaslike/$PROJECT_NAME (now archived)"
   - A `- [ ] Promote to standalone repo once usage stabilizes` checkbox
   - Add the `nursery` label.
8. Add the project to the Nursery table in `README.md` with a link to the new issue.
9. Stage and commit: `feat(projects): adopt $PROJECT_NAME`.
10. **Leave a moved-notice in the original directory** — write (or prepend) a short block to `$ARGUMENTS/CLAUDE.md` and `$ARGUMENTS/README.md`:
    - CLAUDE.md: `> ⚠️ This project has moved to [agent-marketplace](https://github.com/joeblackwaslike/agent-marketplace/tree/main/projects/$PROJECT_NAME). Do not continue development here.`
    - README.md: same notice prepended before the title.
11. Ask the user if they want to delete the original directory at `$ARGUMENTS`.
