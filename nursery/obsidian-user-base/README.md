# obsidian-user-base

Karpathy-style LLM-maintained wiki for Joe Black's Obsidian vault.

New clippings land in `Clippings/` → a watchdog daemon detects them → Claude Code
reads the note and updates or creates structured reference articles in `_wiki/`.

---

## What's already done

| Phase | What happened |
|-------|--------------|
| 0 | Deleted trash/, zero-byte files, empty folders, near-empty stubs |
| 1 | Created `_meta/vault-schema.md` — canonical frontmatter + tag schemas |
| 2 | Enriched frontmatter on all 236 notes (title, type, status, created, tags) |
| 3 | Applied content-inferred tags across 218 notes using the 26-tag vocabulary |
| 4 | Built wikilink graph: 192 inline links, 112 `related:` arrays, 14 stubs, 26 pipeline cross-links |
| 5 | Restructured folders: Pathrise → Job Search/, Python/APIs/Databases → Development/, 19 root stragglers homed |
| 6 | Built this repo: ingest engine, watcher daemon, launchd plist — smoke-tested ✓ |

The vault now has 250 notes, zero disconnected islands, and 2 seed wiki articles in `_wiki/`.

---

## Prerequisites

- **Obsidian** running with the vault open
- **`uv`** installed (`brew install uv`)
- **`just`** installed (`brew install just`)
- **`claude` CLI** installed and authenticated (`npm install -g @anthropic-ai/claude-code`)

Verify:
```bash
claude --version   # should print 2.x.x
just --version
uv --version
```

---

## Next steps — run these in order

### 1. Install dependencies

```bash
cd ~/github/joeblackwaslike/obsidian-user-base
just setup
```

### 2. Bootstrap `_wiki/` from existing vault notes

This processes all 249 existing notes to seed the wiki. Each note spawns a Claude
subprocess — expect it to run for a while. You can stop and restart at any time;
already-created articles will be updated (not duplicated) on re-runs.

```bash
just bootstrap
```

To see what it would do without spending tokens:
```bash
just bootstrap-dry
```

### 3. Install the background watcher

Starts automatically at login. Detects new files in `Clippings/` and ingests them.

```bash
just install-launchd
```

Check it's running:
```bash
just status
```

Watch the live log:
```bash
tail -f ~/Library/Logs/wiki-watcher.log
```

### 4. Test end-to-end

Save any webpage with Obsidian Web Clipper → it lands in `Clippings/` → within ~35s
a new or updated article should appear in `_wiki/`. Check the log to see the report.

---

## Day-to-day commands

```bash
just ingest "/path/to/note.md"   # manually ingest one note
just wiki-stats                   # count current wiki articles
just status                       # check watcher daemon status
just unload-launchd               # stop the watcher
just install-launchd              # (re)start the watcher
```

---

## How the ingest works

```
New .md in Clippings/
    └─▶ watcher.py detects file event
            └─▶ waits 5s (settle)
                    └─▶ ingest.py builds prompt + calls: claude --dangerously-skip-permissions --print "<prompt>"
                                └─▶ Claude reads source note
                                        └─▶ scans _wiki/ for related articles
                                                └─▶ updates or creates articles
                                                        └─▶ logs report
```

Claude reads `CLAUDE.md` in this repo at the start of every ingest run. That file
contains the article schema, ingest instructions, tag vocabulary, and policies
(contradictions, stubs, versioning). Edit it to change ingest behaviour.

---

## Repo structure

```
obsidian-user-base/
├── CLAUDE.md                              ← ingest instructions (edit to tune behaviour)
├── README.md                              ← this file
├── justfile                               ← all runnable commands
├── pyproject.toml                         ← uv project
├── uv.lock
├── src/
│   ├── ingest.py                          ← CLI: single note or --bootstrap
│   └── watcher.py                         ← watchdog daemon
├── scripts/
│   ├── phase4_wikilinks.py                ← one-time: built wikilink graph
│   └── phase5_restructure.py              ← one-time: executed folder moves
├── launchd/
│   └── com.joeblack.wiki-watcher.plist   ← login agent (installed via just install-launchd)
└── docs/
    └── PRD.md                             ← original renovation plan
```

---

## Vault paths

| Location | Path |
|----------|------|
| Vault root | `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault` |
| Wiki articles | `<vault>/_wiki/` |
| Schema reference | `<vault>/_meta/vault-schema.md` |
| New clippings | `<vault>/Clippings/` |
| Watcher log | `~/Library/Logs/wiki-watcher.log` |
| Watcher error log | `~/Library/Logs/wiki-watcher-error.log` |

---

## Troubleshooting

**Bootstrap is slow** — each note is a separate Claude subprocess. Use `--delay 0` to
remove the inter-note pause (risks rate-limiting):
```bash
uv run python src/ingest.py --bootstrap --delay 0
```

**Watcher isn't triggering** — confirm Obsidian Web Clipper is saving to `Clippings/`
(not a subfolder). The watcher only watches the top level, not recursively.

**`claude` not found by launchd** — the plist hardcodes the NVM node path. If your
node version changes, update the `PATH` in `launchd/com.joeblack.wiki-watcher.plist`
then re-run `just install-launchd`.

**Obsidian REST API not connecting** — the MCPVault MCP server needs Obsidian running
with the Local REST API plugin active on port 27124. This doesn't affect the ingest
pipeline (which uses the filesystem directly), only MCPVault-based tooling.
