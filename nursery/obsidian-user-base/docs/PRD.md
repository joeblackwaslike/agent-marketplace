# Obsidian Vault Renovation & Karpathy Wiki — PRD

**Date:** 2026-04-20  
**Status:** Approved  
**Vault:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault`  
**Tooling repo:** `~/github/joeblackwaslike/obsidian-user-base`

---

## Problem

253-note Obsidian vault with:
- Zero wikilinks — every note is a disconnected island
- 59% of notes (148) have no frontmatter
- Tags sparse and inconsistent (`#web` ×12 is the most common)
- 101 folders for 253 notes (~1 folder per 2.5 notes) — folders doing tag-work
- No ongoing system for integrating new research into a coherent knowledge base

---

## Goals

1. **Clean** — remove junk (empty files, empty folders, trash)
2. **Enrich** — standardize frontmatter across all notes
3. **Connect** — build a wikilink graph from zero
4. **Restructure** — flatten over-nested folder hierarchy
5. **Systematize** — set up a Karpathy-style LLM-maintained wiki for ongoing research

---

## Out of Scope

- Migrating away from Obsidian
- Changing the web clipping workflow (Obsidian Web Clipper stays)
- RAG or semantic search infrastructure

---

## MCP Integration

**Server:** MCPVault (mcpvault.org)  
**Plugin:** Obsidian Local REST API (community plugin, port 27123)  
**Auth:** API key configured in `~/.claude.json`

Used for: `list_all_tags`, `batch_update_properties`, `get_note` during phases 2–4.

---

## Phase 0 — Triage Deletions

All approved. Execute before any enrichment.

| Category | Count | Action |
|---|---|---|
| `trash/` folder | 10 files | Delete entire folder |
| Zero-byte files | 6 files | Delete |
| Empty folders | 12 folders | Delete |
| Near-empty stubs (<100 chars) | 7 files | Delete all |

Leave `.smart-env/` subfolders — Smart Connections plugin manages them.

**Files to delete:**
- `Untitled.md`
- `Development/AI/Agents/Agent Memory.md`
- `FBA/AmazonFBA Product Research.md`
- `Job Search/BCTCI/CH5 Mindset & the Numbers Game.md`
- `trash/2025-01-22T032838Z.md`, `trash/2025-03-10T042551Z.md`
- `Pathrise/Pathrise.md`, `FBA/ChatGPT Assisted Research.md`
- `Job Search/Emerging AI Companies nearing IPO Scale.md`
- `Development/AI/Prompt Engineering.md`
- `Development/Markdown/Math expressions in markdown.md`
- `Development/AI/Autoresearch/Autoresearch.md`
- `Home/Eviction Timeline notes.md`

---

## Phase 1 — Schema

Create `_meta/vault-schema.md` documenting both schemas below.

### Vault note frontmatter

```yaml
---
title: ""
type: note        # clipping | note | book-note | idea | job-application
                  # reference | agent-spec | prompt | stub
tags: []
status: draft     # draft | evergreen | reference | archived | stub
created: YYYY-MM-DD
description: ""
source: ""        # URL if applicable
---
```

**Type → folder mapping:**

| type | folder |
|---|---|
| `clipping` | `Clippings/` |
| `book-note` | `Book Notes/` |
| `job-application` | `Job Search/Pipeline/` |
| `prompt` | `copilot/` |
| `agent-spec` | `Development/AI/Agents/` |
| `note` | everything else |

**Approved tag vocabulary (26 tags):**

`python` · `fastapi` · `ai` · `agents` · `mcp` · `claude` · `llm` · `job-search` · `interview` · `algorithms` · `rust` · `javascript` · `obsidian` · `book-notes` · `clipping` · `fba` · `personal` · `ideas` · `opentelemetry` · `pydantic` · `sqlalchemy` · `docker` · `typescript` · `pathrise` · `behavioral-interview` · `system-design`

### Wiki article frontmatter

```yaml
---
title: ""
type: wiki-article
tags: []
status: evergreen         # draft | evergreen | stub | deprecated
description: ""           # one-line summary
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: 1                # incremented on each substantive LLM update
sources:                  # wikilinks to source notes used to compile this article
  - "[[Note Title]]"
aliases: []               # alternate names for wikilink resolution
confidence: high          # high | medium | low
related:                  # semantically related articles not linked inline
  - "[[Article]]"
---
```

### Wiki article body structure

```markdown
## What it is
- bullet points

## Key concepts / How it works
- bullet points

## Gotchas / Limitations
- bullet points (omit section if none)

## Contradictions / Open questions
- conflicts between sources noted here (omit section if none)

## Related
[[ArticleA]] · [[ArticleB]] · [[ArticleC]]
```

---

## Phase 2 — Frontmatter Enrichment

**148 notes with no frontmatter** — add:
- `title` from filename (strip `.md`, humanize)
- `type` from folder mapping
- `status: draft`
- `created` from file mtime
- `tags: []`

**92 existing Clippings** — already rich. Add only `type: clipping` and `status: draft` if missing. Never overwrite `title`, `author`, `published`, `source`, `created`.

**13 `copilot/` notes** — add `type: prompt`, keep all existing `copilot-command-*` keys.

---

## Phase 3 — Tag Inference

1. Read each note body
2. Infer tags against the 26-tag vocabulary
3. Flag novel tags (not in vocabulary)
4. Generate tag report for user approval
5. After approval: apply via MCPVault `batch_update_properties`

Novel tags staged in `_meta/vault-schema.md` pending section until approved.

---

## Phase 4 — Wikilink Graph

Starting from 0 wikilinks. Strategy in order of confidence:

1. **Verbatim title links** — scan bodies for exact matches to other note titles (case-insensitive) → wrap in `[[wikilink]]`
2. **`related:` array** — notes sharing 2+ tags with no natural inline link → add `related: ["[[NoteA]]"]` to frontmatter
3. **Stub nodes** — concepts mentioned 3+ times with no dedicated note → create stub at appropriate path (`status: stub`)
4. **Job pipeline links** — each `Job Search/Pipeline/{Company}/` note → link to `Behavioral Interviewing` and resume notes

---

## Phase 5 — Folder Restructure

**Target structure:**
```
/Development/       (AI, Python, APIs — differentiated by tags)
/Job Search/        (Pipeline + Pathrise + BCTCI + Resumes)
/Book Notes/
/Clippings/
/Ideas/
/Personal Notes/
/Home/
/FBA/
/archive/
/_meta/
/_wiki/
```

**Collapse rules:**
- `Development/Python/` → `Development/` + `tags: [python]`
- `Development/APIs/` → `Development/` + `tags: [api, fastapi]`
- `Development/Databases/` → `Development/` + `tags: [sqlalchemy, docker]`
- `Pathrise/` → `Job Search/` + `tags: [pathrise, algorithms]`
- `Clippings/Pathrise Core Module *` (13 notes) → `Job Search/`

**Keep as-is:**
- `Job Search/Pipeline/{Company}/`
- `Book Notes/{Book}/`
- `Development/AI/Agents/conductor-vscode-agents/`
- `FBA/`

**Process:** Generate proposed move list → user confirms per folder → execute → fix any broken wikilinks.

---

## Phase 6 — Karpathy Wiki

### Architecture

```
Raw Sources (immutable)            LLM Agent                    Wiki (maintained)
──────────────────────             ──────────────               ─────────────────
Obsidian Vault/Clippings/    →    obsidian-user-base/     →    Obsidian Vault/_wiki/
+ rest of vault (bootstrap)       CLAUDE.md + scripts           ~50–150 articles
```

### Ingest flows

**Ongoing (automatic):**
1. New `.md` file lands in `Clippings/` via Obsidian Web Clipper
2. `watcher.py` (watchdog, running as launchd service) detects file system event
3. Waits 5s for write to complete → calls `ingest.py <path>`
4. `ingest.py` builds prompt + shells out to `claude --print`
5. Claude Code reads source, scans `_wiki/`, updates matching articles or creates new ones
6. `version` incremented, `updated` set, `sources` extended, wikilinks added
7. New/updated articles visible in Obsidian within ~30s

**Bootstrap (one-time):**
```bash
just bootstrap
```
- Processes all 253 existing vault notes in batches
- Order: Clippings → Book Notes → Development notes → everything else
- Rate-limit safe (configurable delay between batches)
- Seeds `_wiki/` with ~50–100 initial articles

### What Claude does during each ingest

```
1. Read the source file
2. Identify main concepts/topics covered
3. Scan _wiki/ for articles on those concepts
4. For matching articles:
   - Merge new information in
   - Note contradictions in ## Contradictions section
   - Increment version
   - Update `updated` date
   - Extend `sources` array
5. For concepts with no article yet:
   - Create new article using CLAUDE.md template
6. Add [[wikilinks]] between articles where referenced
7. Report: N articles updated, M articles created
```

**Contradiction policy:** Note conflicts explicitly in `## Contradictions`, set `confidence: low`. Never silently pick one source over another.

**Stub policy:** Create stubs for concepts mentioned 3+ times with no existing article. `status: stub`, `confidence: low`.

### `obsidian-user-base/` repo structure

```
obsidian-user-base/
├── CLAUDE.md                          # Article template, tag vocab, ingest rules
├── justfile                           # just watch | just bootstrap | just ingest <file>
├── pyproject.toml                     # uv project
├── src/
│   ├── watcher.py                     # watchdog daemon
│   └── ingest.py                      # builds prompt, shells out to claude CLI
└── launchd/
    └── com.joeblack.wiki-watcher.plist
```

### Tech stack

- `uv` — package management
- `watchdog` — file system events
- `typer` + `rich` — CLI
- `structlog` — logging
- `claude` CLI — ingest engine (Option B: CC does the actual file read/write)

---

## Execution Order

```
Step 0:  Install + verify MCPVault
Phase 0: Triage deletions
Phase 1: _meta/vault-schema.md
Phase 2: Frontmatter enrichment (batch)
Phase 3: Tag inference report → approval → apply
Phase 4: Wikilink graph construction
Phase 5: Folder restructure → move list → approval → execute
Phase 6: obsidian-user-base scaffold → CLAUDE.md → bootstrap _wiki/
```

---

## Verification Checklist

- [ ] MCPVault `list_all_tags` returns expected tag set
- [ ] MCPVault `get_note` on enriched note shows correct frontmatter shape
- [ ] Obsidian graph view shows connected nodes after Phase 4
- [ ] `_meta/vault-schema.md` documents both vault and wiki schemas
- [ ] No broken wikilinks after Phase 5 folder moves
- [ ] `obsidian-user-base/` repo has `CLAUDE.md`, `justfile`, `watcher.py`, `ingest.py`
- [ ] `just bootstrap` runs without errors, `_wiki/` populated with articles
- [ ] Drop a new clipping → `_wiki/` article appears/updates within 30s
