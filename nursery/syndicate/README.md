# syndicate

A personal CLI that syndicates flat-markdown articles from `private-content/drafts/articles/`
to Substack, dev.to, the personal website's writing index, Medium, X, LinkedIn, and Facebook.
It reads each article's frontmatter to see which platforms it's already synced to, drafts
captions for the social platforms with Claude, and walks you through publishing to whatever's
missing — then commits and pushes the resulting frontmatter/site-index changes to git.

## Configuration

Configuration is read from environment variables (see `src/config.ts`):

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Used to draft X/LinkedIn/Facebook captions via Claude |
| `DEVTO_API_KEY` | yes | Used to check dev.to sync status and publish new posts |
| `ARTICLES_DIR` | no | Defaults to `private-content/drafts/articles` |
| `SITE_INDEX_PATH` | no | Defaults to `site/index.html` |

## Usage

Build once, then run the CLI directly:

```bash
pnpm build
node dist/cli.js sync
node dist/cli.js baseline <file>
```

Or link it so the `syndicate` command is on your `PATH` (`npm link` / `pnpm link --global`
from this directory), after which:

```bash
syndicate sync
syndicate baseline <file>
```

To run from source without building (useful during development):

```bash
pnpm exec tsx src/cli.ts sync
pnpm exec tsx src/cli.ts baseline <file>
```

### `sync`

Scans `ARTICLES_DIR` for articles with `status: ready` in frontmatter, computes which
platforms each one is still missing, and syncs the gaps — interactively for manual platforms
(Substack, Medium, X, LinkedIn, Facebook), automatically for dev.to and the website index.

**A brand-new article takes two runs to fully propagate.** Substack is the canonical source —
every other platform's post links back to it — so the first `sync` run only publishes to
Substack (nothing downstream can happen until that URL exists). Run `sync` again afterward to
pick up dev.to, the website card, and the social captions now that the canonical URL is set.

If an article fails partway through a run, whatever succeeded before the failure is still
committed and pushed (tagged `(partial run)` in the commit message) before the error is
re-thrown, so already-synced platforms are never left stranded uncommitted.

### `baseline <file>`

For an article that was already published by hand before this tool existed: walks through
each platform, asks whether it's already synced, and records that in frontmatter — without
publishing anything. Use this once per pre-existing article to bring its frontmatter in line
with reality before `sync` starts managing it.

## Development

```bash
pnpm install       # installs deps, wires up git hooks
pnpm dev           # tsx src/cli.ts (pass CLI args after --, e.g. pnpm dev -- sync)
pnpm build         # compile to dist/
pnpm test          # vitest
pnpm check         # typecheck + lint
```

See `AGENTS.md` for full tooling/conventions and `CONTRIBUTING.md` for PR guidelines.
