# Syndicate — Website as Canonical Source

**Date:** 2026-08-11
**Status:** Approved
**Supersedes:** the "Website" row of `docs/superpowers/specs/2026-08-08-syndicate-design.md` (v1 scoped
the website to a homepage card linking out to Substack; this revises that).

## Context

`syndicate sync` currently treats Substack as the canonical URL every other platform links to or
imports from, and treats `joeblack.nyc` (`site/`) as a card-only surface: a `<article
class="writing-card">` entry on the homepage linking out to the Substack post. Running the tool
against the first real article surfaced two problems with that:

1. `syndication.website` never gets a URL of its own — there's nothing to record, because the site
   doesn't host anything.
2. Joe wants to own the canonical copy of his writing (SEO, durability — not dependent on a platform
   he doesn't control) *and* wants readers who land on the site to read in place, not bounce to
   Substack.

Substack has no mechanism to defer its own canonical tag to an external domain (confirmed via
research 2026-08-11 — every Substack post self-canonicalizes to its own URL, with no settings field
or override; this is unlike Medium, which does support an external canonical field, though moot here
since Medium publishing is already fully manual per the v1 spec). Given that constraint, the site
becomes canonical and Substack becomes a full-text syndicated copy carrying a backlink — an
unenforceable "soft signal" to search engines, not a guarantee, and an explicit, accepted tradeoff
rather than an oversight.

## What Changes

| Platform | v1 (2026-08-08) | v2 (this doc) |
| --- | --- | --- |
| **Website** | Card only, links to Substack, no URL recorded. | Publishes first. Full article page at `joeblack.nyc/writing/<slug>/`, homepage card links internally. `syndication.website.url` is real. |
| **Substack** | Canonical URL for every other platform. Fully manual — no content auto-copied to clipboard. | Syndicated full-text copy. Publisher now copies article content **plus** an "Originally published at [site URL]" backlink to the clipboard before prompting. |
| **dev.to** | `canonical_url` = Substack URL. | `canonical_url` = site URL (dev.to supports real external canonical — an unambiguous improvement, not a tradeoff). |
| **Medium, X, LinkedIn, Facebook** | Link to Substack URL. | Link to site URL. No other behavior change. |
| **Sequencing gate** (`diff.ts`) | Nothing syncs until `substack.status == synced`. | Nothing syncs until `website.status == synced`. |

## Page Generation

**Renderer:** `marked` for markdown → HTML. Lightweight, no plugin ceremony; sufficient for the
current article shapes (headings, links, code fences, lists, blockquotes). `remark`/`rehype` noted as
the fallback if syntax highlighting or heavier extensibility becomes a real need later — not adopted
now (YAGNI).

**Output:** `website-publisher.ts` writes `site/writing/<slug>/index.html` — a full page reusing the
homepage's actual nav and footer markup (same structure as `site/index.html`, confirmed 2026-08-11)
and the shared `style.css`/font stack, so article pages are visually indistinguishable from
hand-built site pages, including after future design changes. Page includes:

- `<title>`, `<meta name="description">`, and OG tags from the article's frontmatter (`title`,
  `description`).
- `<link rel="canonical" href="{SITE_BASE_URL}/writing/{slug}/">`.
- Rendered article body (title, tag, published date, read time, then content).
- Same nav/footer as the homepage, with the nav's in-page anchors (`#writing`, `#projects`, etc.)
  pointed back at the homepage (`/#writing`) rather than left as bare fragments.

**Build integration:** `site/vite.config.js` globs `writing/*/index.html` into
`build.rollupOptions.input` alongside the existing root `index.html`, so Vite's normal asset
pipeline (hashed CSS/fonts) covers article pages the same way it covers the homepage. No changes to
`.github/workflows/deploy-pages.yml` — it already runs `vite build` fresh and uploads `dist/`
verbatim.

**Homepage card:** `insertWritingCard`'s `url` becomes `/writing/{slug}/` (internal) instead of the
Substack URL.

## Config

New required env var: `SITE_BASE_URL` (e.g. `https://joeblack.nyc`), validated in `config.ts`'s
`envSchema` the same way `SUBSTACK_SUBDOMAIN` is. Used to build the article's canonical URL, OG tags,
and the `syndication.website.url` value written to frontmatter.

## Control Flow

- **`diff.ts`:** the Substack-first gate becomes a website-first gate — no other platform's gap is
  actioned for an article until `syndication.website.status == synced`.
- **`website-status.ts`:** the live-check changes from scanning `site/index.html` for an `href` match
  against a given URL, to checking whether `site/writing/{slug}/index.html` exists on disk. Simpler,
  more direct, still self-healing (derived from actual repo state, not trusted frontmatter) —
  consistent with the v1 design's reconciliation philosophy.
- **`sync-article.ts`:** `canonicalUrl` is currently computed once, at the top of `syncArticle`, from
  `syndication.substack.url`. It changes to read from `syndication.website.url` at the point each
  downstream platform (devto, medium, x, linkedin, facebook) needs it. `syncWebsite` itself no longer
  *receives* a canonical URL — it *produces* one, deterministically, from `article.frontmatter.slug`
  and the new `SITE_BASE_URL` config value, independent of any other frontmatter field.

  This doesn't create a same-run chicken-and-egg problem: the ported gate (website-first, same
  mechanics as v1's substack-first gate) means `gaps` contains *only* `['website']` for any article
  where `syndication.website.status != synced` — no other platform is ever actioned in that same run.
  So `syndication.website.url` is always already persisted to disk by the time any downstream
  platform's turn comes, whether that's later in the same run (website already synced coming in) or a
  subsequent run (website just got synced last time). `syncArticle` never needs to read a value that
  the current run hasn't already durably written.
- **Substack publisher:** gains a clipboard-write step (currently has none) — copies `article.content`
  plus the backlink line before prompting for the resulting URL. This also means Substack's manual
  content-transfer step, previously entirely outside the tool, becomes at least clipboard-assisted.

## Self-Healing Backfill

Because the website live-check is derived from disk state rather than trusted frontmatter, the one
already-published article (`2026-08-08-writing-the-plot.md`, currently
`syndication.website.status: synced` with no URL, from the v1 card-only flow) will be detected as
*not yet on the website* on the next `sync` run — `site/writing/i-thought-id-lost-the-plot/index.html`
doesn't exist yet — and gets the page generated and the URL recorded automatically. No manual
migration step, no special-casing of pre-existing articles.

## Error Handling

- **Markdown render failure** — fail loudly, consistent with the existing "no placeholder output"
  philosophy; re-running `sync` is the retry mechanism (same posture as the Claude-drafting and
  dev.to-publish failure modes in the v1 spec).
- **`SITE_BASE_URL` missing** — `config.ts`'s Zod schema rejects it at startup, same as any other
  required env var.
- **HTML injection** — not a new concern beyond what v1 already handles (title/tag escaping into
  `site/index.html`); the article body itself is Joe's own trusted content, not user-generated input.

## Testing Strategy

Per the TDD gate: tests written first, seen failing (RED) for the stated reason, then made to pass.

- **Pure logic, unit tested:** the markdown-to-page-HTML rendering function (given frontmatter +
  content, assert correct output including canonical/OG tags), the updated `insertWritingCard` (now
  asserts an internal href), the updated `diff.ts` gating (website-first instead of substack-first),
  the updated `sync-article.ts` canonical-URL threading.
- **I/O boundaries:** the website-status file-existence check (real temp-dir fixtures, not mocked,
  consistent with this project's existing preference for real filesystem/git operations over pure
  mocks wherever safe) and the Substack publisher's new clipboard-write step (injected
  `ClipboardWriter`, same pattern as the other manual publishers).
- **Build integration:** verified manually via a real `vite build` run against a fixture article page,
  confirming the glob picks it up and hashed asset references resolve — not something a unit test
  meaningfully covers.

## Future Work (explicitly out of scope)

- Syntax highlighting for code fences (currently plain `<pre><code>`, matching the site's monospace
  aesthetic without a highlighting dependency).
- RSS/Atom feed generation from the same article set.
- Image handling within article markdown (no current article has embedded images; add when one does).
