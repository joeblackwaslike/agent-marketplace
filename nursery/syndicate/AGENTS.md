# syndicate



## Stack

- **Language:** TypeScript (ESM, `pnpm` for dependency management)
- **Tooling:** Biome + ESLint (lint/format), Vitest (tests), `tsc` (build), Docusaurus (docs)
- **Runtime:** Node >= 22

## Commands

```sh
pnpm dev             # run src/cli.ts (tsx); pass CLI args after --, e.g. pnpm dev -- sync
pnpm build           # compile TypeScript -> dist/
pnpm test            # run tests (vitest)
pnpm test:coverage   # tests with coverage
pnpm lint            # Biome + ESLint
pnpm lint:fix        # autofix lint issues
pnpm format          # Biome formatter
pnpm typecheck       # tsc --noEmit
pnpm check           # typecheck + lint
```

## Conventions

- Tests live in `tests/`, mirroring `src/` structure
- Use `pnpm add` to add dependencies, never hand-edit the `package.json` deps
- ESM only (`"type": "module"`); target Node >= 22 (pinned in `.nvmrc` / `.tool-versions`)
- Conventional Commits enforced by commitlint — run `pnpm commit` for a guided prompt

## Agent Instruction Files

`AGENTS.md` (this file) is the source of truth — readable by Codex, Gemini, OpenCode, Cursor, and GitHub Copilot directly.
`CLAUDE.md` contains only `@AGENTS.md` so Claude Code imports this file inline.

Do **not** write `@filename` imports in AGENTS.md — that syntax is Claude Code-only and does nothing in other tools.

## Setup

Get a working dev environment — installs dependencies and wires up the git hooks (Husky `prepare`):

```sh
pnpm install
```
