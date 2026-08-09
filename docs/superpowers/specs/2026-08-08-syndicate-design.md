# Syndicate — Content Syndication CLI

**Date:** 2026-08-08 (revised 2026-08-09)
**Status:** Approved

## Context

Joe writes long-form articles as flat markdown files with YAML frontmatter under
`private-content/drafts/articles/` and wants each one syndicated out — Substack, Medium, dev.to,
`joeblack.nyc` (this repo's `site/`, deployed via `.github/workflows/deploy-pages.yml`), and shared to
X, LinkedIn, and Facebook — without writing generic "new post: [title] [link]" captions by hand, and
without paying for platform APIs he doesn't currently have budget for.

The local markdown file is the **single source of truth**: it holds both the article content and,
in its own frontmatter, the sync status of every platform. There is no separate manifest file and no
upstream feed to poll — `syndicate` treats "what's been synced where" as a reconciliation problem
(like `terraform plan`/`apply`) against that one file, not a one-shot "process the latest post" script.

Platform reality, researched 2026-08-09 (this shapes what's automatable vs. manual):

| Platform | API for publishing | v1 treatment |
| --- | --- | --- |
| **Substack** | None. Only unofficial, session-cookie-based tools exist — real ToS and account-security risk (a login session cookie as a stored credential) and no stability guarantee. | Manual: `SubstackPublisher` (clipboard-style, see below). |
| **Medium** | Closed to new integrations since ~2025; existing tokens still work, new ones aren't issued. | Manual: `MediumPublisher`, imports by URL via Medium's own "Import a story" tool. |
| **dev.to** | Open, free, real REST API (`POST /api/articles`), supports `canonical_url`, status is live-derivable via `GET /api/articles/me`. | Automated: `DevtoPublisher`. |
| **Hashnode** | Real GraphQL API, but as of 2026-05-13 requires a paid Pro plan (previously free). | Deferred — see Future Work. |
| **X / LinkedIn / Facebook** | Posting APIs exist but require paid tiers or app-review partnerships Joe doesn't currently have. | Manual: `ClipboardPublisher`, AI-drafted captions. |
| **Website** (`joeblack.nyc`) | N/A — it's this repo. | Automated: `WebsitePublisher`, direct git edit + push. |

**Sequencing constraint:** Substack is the canonical public URL every other platform links to or
imports from (Medium's importer needs a URL; dev.to's `canonical_url` needs one; the website and
social captions all link out to it). So Substack must sync first — no other platform's gap is
actioned for an article until `syndication.substack.status == synced`.

## Repo Structure

```text
nursery/syndicate/
├── src/
│   ├── cli.ts                   # Commander entrypoint: `sync` and `baseline` subcommands
│   ├── config.ts                # Zod-validated env: Anthropic key, devto key, articles dir, site path
│   ├── scan.ts                  # Glob private-content/drafts/articles/*.md, parse frontmatter+content
│   ├── frontmatter.ts           # Read/write an article's frontmatter in place (gray-matter)
│   ├── read-time.ts             # Word count → read-time estimate (pure function)
│   ├── website-status.ts        # Derive live website-sync status from site/index.html
│   ├── devto-status.ts          # Derive live dev.to-sync status via GET /api/articles/me
│   ├── diff.ts                  # Compute per-article, per-platform sync gaps + Substack-first gating
│   ├── draft.ts                 # Claude API call → structured X/LinkedIn/Facebook/website captions
│   ├── voice.md                 # Hand-maintained prompt asset: tone/voice guide for drafts
│   ├── approve.ts               # Interactive review/edit loop (@inquirer/prompts)
│   └── publishers/
│       ├── publisher.ts            # Publisher interface
│       ├── substack-publisher.ts   # Manual: prompts for the resulting Substack URL once published
│       ├── medium-publisher.ts     # Manual: copies Substack URL, waits for import confirmation
│       ├── devto-publisher.ts      # Automated: POST /api/articles with canonical_url
│       ├── clipboard-publisher.ts  # Generic clipboard-and-wait (X/LinkedIn/Facebook)
│       └── website-publisher.ts    # Edits site/index.html, commits, pushes
├── test/                        # Vitest — mirrors src/
├── package.json
├── tsconfig.json
└── README.md
```

Scaffolded with `spinup-ts` (pnpm, ESM, strict TS, Biome, Vitest, Husky — standard stack). Lives
under `nursery/` in `agent-marketplace` (not a separate repo) because it needs direct filesystem/git
access to `site/index.html` in this same repo, and because it has an AI-drafting step that fits the
"AI/agent-specific projects incubate in nursery" convention.

## Article Frontmatter Schema

```yaml
---
title: "I Thought I'd Lost the Plot. I Was Writing It."
slug: i-thought-id-lost-the-plot
status: ready # draft | ready — syndicate only ever acts on `ready` articles
tags: [claude-code, ai-agents, autonomous-agents]
description: "I set out to build autonomous agents. I spent two years building the scaffolding instead."
publishedAt: null # set once the Substack sync completes
syndication:
  substack: { status: pending, url: null }
  medium: { status: pending, url: null }
  devto: { status: pending, url: null }
  website: { status: pending }
  x: { status: pending }
  linkedin: { status: pending }
  facebook: { status: pending }
---
```

`status: draft` articles are invisible to `syndicate` entirely — flipping to `status: ready` is the
only signal needed to bring an article into scope. Website and dev.to statuses are read live
(`website-status.ts`, `devto-status.ts`) and re-derived on every run rather than trusted from the
file, so a hand-edit to either surface is self-healing; the `synced`/`pending` values stored for
those two are for audit/history only. Substack, Medium, X, LinkedIn, and Facebook have no live check
available, so their status is only ever set when Joe explicitly confirms an action completed.

## Pipeline

### `syndicate baseline <file>` (one-time, per already-published article)

For an article that was published before `syndicate` existed (e.g. the very first one), interactively
prompts for each platform's current status and URL (if already live) and writes them into that
article's frontmatter without publishing anything. Run once per pre-existing article; new articles
never need this since they start life as `status: draft` with `pending` syndication.

### `syndicate sync` (normal use, run anytime after marking an article `status: ready`)

1. **Scan** — read all `.md` files under `private-content/drafts/articles/`, parse frontmatter, keep
   only `status: ready`.
2. **Status check, per article** — website and dev.to derived live; everything else read from the
   article's own `syndication` block.
3. **Diff** — the set of missing platforms per article, with Substack-first gating: if
   `syndication.substack.status != synced`, only the Substack gap is actioned this run for that
   article (everything else waits for a subsequent run, once a Substack URL exists to link to).
4. **Act on gaps**, in fixed order (`substack → medium → devto → website → x → linkedin → facebook`,
   skipping anything already synced or gated):
   - **Substack** — no AI drafting needed; the article content itself is what gets published. Prints
     instructions to paste the article into a new Substack post and publish it, then prompts for the
     resulting URL. Writes `syndication.substack = { status: synced, url }` and `publishedAt`.
   - **Medium** — copies `syndication.substack.url` to the clipboard, prompts to paste it into
     Medium's importer (`medium.com/p/import`) and publish, waits for confirmation.
   - **dev.to** — `POST /api/articles` with `body_markdown` (the article content), `canonical_url`
     (the Substack URL), and `tags` from frontmatter. Automated, no approval step needed for the
     platform itself, though the request is logged for visibility.
   - **Website** — insert an escaped `<article class="writing-card">` entry into `site/index.html`'s
     writing list, linking to the Substack URL.
   - **X / LinkedIn / Facebook** — one Claude API call per article (only for these three, once, using
     whichever of them are still gaps) drafts captions from the article content, `voice.md`, and the
     now-live Substack URL, via a Zod schema. Each approved caption is copied to the clipboard in
     turn; the pipeline pauses until Joe confirms he's pasted it.
5. Every successful platform action writes its frontmatter update to disk immediately (durable before
   moving to the next platform or article — a Ctrl+C mid-run loses nothing already confirmed).
6. **Commit + push** once at the end of the run, bundling whatever changed (article frontmatter,
   `site/index.html`) with a conventional commit message. Direct push to `main`, consistent with how
   site content updates already happen in this repo.

Re-running `syndicate sync` at any point — including mid-interruption, or after publishing several
articles before getting around to running it — is safe: it only ever acts on genuinely missing
(article, platform) pairs, respecting the Substack-first gate.

## Error Handling

- **No ready articles / no gaps** — `sync` reports "nothing to do" and exits 0.
- **Claude API failure** — fail loudly (aborts the run rather than publishing an empty or
  placeholder caption); no interactive retry prompt in v1 — re-running `sync` is the retry
  mechanism, since the pipeline is idempotent and only ever acts on genuinely missing gaps. An
  in-run retry prompt was considered during implementation and deferred as unnecessary complexity
  for a personal, single-operator tool where re-running the command is just as fast.
- **dev.to API failure** — fail loudly, leave `syndication.devto.status` as `pending`; safe to retry
  on the next run.
- **Clipboard unavailable** (headless/SSH) — catch and print the text instead, so the run is still
  usable manually.
- **HTML injection** — the article title/tag text is HTML-escaped before insertion into
  `site/index.html`; it's the one point where article content becomes markup.
- **Substack-first violation** — if a downstream platform's gap is somehow actioned before Substack is
  synced (e.g. a bug, or manually-edited frontmatter), `diff.ts` refuses and surfaces an explicit
  error rather than silently publishing a caption that links nowhere.

## Testing Strategy

Per the TDD gate: tests written first, seen failing (RED) for the stated reason, then made to pass.

- **Pure logic, fully unit tested:** `read-time.ts` (word count calc), `diff.ts` (gap computation and
  Substack-first gating, given frontmatter fixtures), `frontmatter.ts` (round-trip read/write —
  content is preserved byte-for-byte, only frontmatter fields change), the Zod schema for `draft.ts`'s
  structured output, and the HTML-insertion function in `website-publisher.ts` (given existing markup
  plus a new entry, assert correct, escaped output).
- **I/O boundaries, stubbed/injected in tests:** Claude API client, dev.to API client, clipboard
  write, git exec — `draft.ts`, `devto-publisher.ts`, `clipboard-publisher.ts`, and the git
  commit/push step all take an injectable dependency so business logic tests don't hit the network, a
  real clipboard, or git.

## Future Work (explicitly out of v1 scope)

- Swap `ClipboardPublisher` for a real `XApiPublisher` once paid API access exists — the `Publisher`
  interface is the seam; nothing else in the pipeline changes. Same for LinkedIn/Facebook if/when
  their posting APIs become practical to get approved for.
- Hashnode: add a `HashnodePublisher` (real GraphQL API) if/when Joe decides to pay for Hashnode Pro.
- Revisit Substack automation only if an official publish API ever ships — the unofficial
  session-cookie route was considered and explicitly rejected for v1 on account-security and
  stability grounds.
