# Syndicate — Content Syndication CLI

**Date:** 2026-08-08
**Status:** Approved

## Context

Joe publishes long-form articles to Substack (canonical) and Medium (manual import), and wants each
one reflected on `joeblack.nyc` (this repo's `site/`, deployed via `.github/workflows/deploy-pages.yml`)
and shared to X, LinkedIn, and Facebook — without writing generic "new post: [title] [link]" captions
by hand each time, and without paying for platform APIs he doesn't currently have budget for (X's
write-access API requires a paid tier; LinkedIn's posting API requires Marketing Developer Platform
partner approval that's impractical for a personal profile).

`syndicate` is a personal CLI tool that closes this loop: it treats "what's been synced where" as a
reconciliation problem (like `terraform plan`/`apply`), not a one-shot "process the latest post"
script. It fetches the Substack RSS feed, diffs it against known state per platform, and for anything
missing: drafts a platform-specific caption with Claude (seeded with an editable voice guide so
output doesn't read like boilerplate), walks Joe through inline review/edit, and publishes — directly
via git push for the website leg, via clipboard + manual paste for the social legs (until paid API
access changes that; see Future Work).

Medium and dev.to/Hashnode are explicitly out of scope for `syndicate` v1 — Medium via its own
"Import a story" tool (manual, sets canonical link automatically), dev.to/Hashnode via their native
RSS auto-import. `syndicate` only owns the website + X/LinkedIn/Facebook legs.

## Repo Structure

```text
nursery/syndicate/
├── src/
│   ├── cli.ts                # Commander entrypoint: `sync` and `baseline` subcommands
│   ├── config.ts             # Zod-validated env: RSS URL, Anthropic key, path to site/index.html
│   ├── rss.ts                 # Fetch + parse Substack RSS feed
│   ├── extract.ts             # HTML → plain text, read-time estimate (pure function)
│   ├── state.ts                # Read/write .syndicate/state.json
│   ├── website-status.ts       # Derive live website-sync status from site/index.html
│   ├── diff.ts                 # Compute per-article, per-platform sync gaps
│   ├── draft.ts                 # Claude API call → structured captions (Zod schema)
│   ├── voice.md                 # Hand-maintained prompt asset: tone/voice guide for drafts
│   ├── approve.ts                # Interactive review/edit loop (@inquirer/prompts)
│   └── publishers/
│       ├── publisher.ts           # Publisher interface
│       ├── clipboard-publisher.ts  # Generic clipboard-and-wait publisher (X/LinkedIn/Facebook)
│       └── website-publisher.ts    # Edits site/index.html, commits, pushes
├── test/                        # Vitest — mirrors src/
├── .syndicate/
│   └── state.json                # Committed. Per-article, per-platform sync state.
├── package.json
├── tsconfig.json
└── README.md
```

Scaffolded with `spinup-ts` (pnpm, ESM, strict TS, Biome, Vitest, Husky — standard stack). Lives
under `nursery/` in `agent-marketplace` (not a separate repo) because it needs direct filesystem/git
access to `site/index.html` in this same repo, and because it has an AI-drafting step that fits the
"AI/agent-specific projects incubate in nursery" convention.

## Pipeline

### `syndicate baseline` (one-time)

Fetches the current Substack RSS feed and writes every existing item into `.syndicate/state.json` as
fully synced on every platform (website, x, linkedin, facebook), without publishing anything. Run
once, immediately after `syndicate` first exists, so historical articles are never mistaken for new
work. Commits `.syndicate/state.json`.

### `syndicate sync` (normal use, run anytime after publishing)

1. **Fetch** — pull all items from the Substack RSS feed.
2. **Status check, per article:**
   - **Website** — derived live: does `site/index.html`'s writing list already contain an entry
     linking to this article's URL? Self-healing — doesn't trust stale state if the file was hand-edited.
   - **X / LinkedIn / Facebook** — read from `.syndicate/state.json` (no API to check against; state
     is only ever set when Joe explicitly confirms he pasted a caption).
3. **Diff** — for each article, the set of platforms where it's missing.
4. **Act on gaps only** — for each article with at least one gap:
   - **Draft** — one Claude API call with the article's full text (`content:encoded` from RSS,
     converted to plain text) plus `voice.md`, returning structured output: `x`, `linkedin`,
     `facebook` captions and a `website: { tag, title }` blurb, via a Zod schema.
   - **Approve** — walk through only the gap platforms for this article, in a fixed order
     (`x` → `linkedin` → `facebook` → `website`, skipping any already synced); each draft is shown
     for inline edit or accept.
   - **Publish**, per approved platform, in the same fixed order:
     - Social — copy to clipboard, prompt "Paste into `<platform>` now, press Enter when done,"
       then write `.syndicate/state.json` immediately (durable before moving to the next platform;
       a Ctrl+C after this point doesn't lose the confirmation).
     - Website — insert an escaped `<article class="writing-card">` entry at the top of the writing
       list in `site/index.html`; state write happens alongside.
5. **Commit + push** once at the end of the run, bundling whatever changed (`site/index.html`,
   `state.json`) with a conventional commit message. This is a direct push to `main`, consistent with
   how site content updates already happen in this repo (no PR required for content-only changes).

Re-running `syndicate sync` at any point — including mid-interruption — is safe: it only ever acts on
genuinely missing (article, platform) pairs.

## Data Model — `.syndicate/state.json`

```json
{
  "https://joeblackwaslike.substack.com/p/i-thought-id-lost-the-plot": {
    "title": "I Thought I'd Lost the Plot. I Was Writing It.",
    "publishedAt": "2026-08-08T12:00:00Z",
    "platforms": {
      "website": "synced",
      "x": "synced",
      "linkedin": "synced",
      "facebook": "pending"
    }
  }
}
```

Keyed by the article's canonical Substack URL (stable, present in every RSS item's `<link>`). Website
status is read live and only written here for audit/history — `diff.ts` always re-derives it from
`site/index.html` rather than trusting this field, so a manual edit to the site never causes a
missed or duplicate sync.

## Error Handling

- **No new items** — `sync` reports "nothing to do" and exits 0 if the diff is empty.
- **Claude API failure** — fail loudly with a retry prompt; never publish an empty or placeholder
  caption.
- **Clipboard unavailable** (headless/SSH) — catch and print the caption text instead, so the run is
  still usable manually.
- **HTML injection** — AI-drafted `tag`/`title` text is HTML-escaped before insertion into
  `site/index.html`; it's the one point where generated text becomes markup.
- **RSS item missing full content** — fall back to fetching the article URL directly and extracting
  text from that, if `content:encoded` is absent or truncated.

## Testing Strategy

Per the TDD gate: tests written first, seen failing (RED) for the stated reason, then made to pass.

- **Pure logic, fully unit tested:** `extract.ts` (HTML→text, read-time calc), `diff.ts` (gap
  computation given a feed + state fixture), the Zod schema for `draft.ts`'s structured output, and
  the HTML-insertion function in `website-publisher.ts` (given existing markup + a new entry, assert
  correct, escaped output).
- **I/O boundaries, stubbed/injected in tests:** Claude API client, clipboard write, git
  exec — `rss.ts`, `draft.ts`, `clipboard-publisher.ts`, and the git commit/push step all take an
  injectable dependency so business logic tests don't hit the network, a real clipboard, or git.

## Future Work (explicitly out of v1 scope)

- Swap `ClipboardPublisher` for a real `XApiPublisher` once paid API access exists — the `Publisher`
  interface is the seam; nothing else in the pipeline changes.
- Same for LinkedIn/Facebook if/when their posting APIs become practical to get approved for.
- Medium/dev.to/Hashnode integration, if their import mechanisms ever stop being sufficient on their
  own.
