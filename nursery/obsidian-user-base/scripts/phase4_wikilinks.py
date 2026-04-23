#!/usr/bin/env python3
"""Phase 4 — Wikilink Graph Construction.

Steps:
1. Verbatim title links  — find plain-text title mentions, wrap in [[...]]
2. related: frontmatter  — notes sharing 2+ tags, no existing link → add related:
3. Stub node creation    — concepts mentioned 3+ times with no dedicated note
4. Job pipeline links    — company notes → Behavioral Interviewing + resume notes
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

VAULT = Path(os.path.expanduser(
    "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault"
))

# Minimum title length to consider for verbatim matching (avoids noise)
MIN_TITLE_LEN = 5

# Tags that appear in many notes — skip for related: pairing to avoid mega-clusters
COMMON_TAGS = {"clipping", "ai", "job-search", "python", "book-notes", "algorithms", "interview"}

# Stub concepts: if a concept string appears 3+ times with no dedicated note,
# we create a stub. We derive these from the title index gaps, not a hard list.
STUB_THRESHOLD = 3

# Job pipeline cross-link targets
JOB_PIPELINE_DIR = "Job Search/Pipeline"
BEHAVIORAL_NOTE = "Behavioral Interviewing"  # exact title or close match

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
TAG_LINE_RE = re.compile(r"^tags:\s*\[([^\]]*)\]", re.MULTILINE)
TAG_LIST_RE = re.compile(r"^tags:\s*\n((?:[ \t]*-[ \t]+\S+\n?)+)", re.MULTILINE)
TITLE_LINE_RE = re.compile(r"^title:\s*(.+)$", re.MULTILINE)
STATUS_LINE_RE = re.compile(r"^status:\s*(.+)$", re.MULTILINE)
TYPE_LINE_RE = re.compile(r"^type:\s*(.+)$", re.MULTILINE)
RELATED_LINE_RE = re.compile(r"^related:\s*(.+)$", re.MULTILINE | re.DOTALL)


@dataclass
class Note:
    path: Path          # absolute
    rel: Path           # relative to vault
    raw: str            # full file content
    fm: str             # frontmatter block (between ---)
    body: str           # content after frontmatter
    title: str          # display title
    tags: list[str] = field(default_factory=list)
    status: str = ""
    note_type: str = ""
    existing_links: set[str] = field(default_factory=set)  # linked note titles


def load_notes() -> list[Note]:
    notes = []
    for p in sorted(VAULT.rglob("*.md")):
        if any(part.startswith(".") for part in p.relative_to(VAULT).parts):
            continue
        raw = p.read_text(encoding="utf-8", errors="replace")
        m = FM_RE.match(raw)
        if m:
            fm = m.group(1)
            body = raw[m.end():]
        else:
            fm = ""
            body = raw

        # Extract title
        tm = TITLE_LINE_RE.search(fm)
        title = tm.group(1).strip().strip('"').strip("'") if tm else p.stem

        # Extract tags
        tags: list[str] = []
        tl = TAG_LINE_RE.search(fm)
        if tl:
            tags = [t.strip().strip('"').strip("'")
                    for t in tl.group(1).split(",") if t.strip()]
        else:
            tl2 = TAG_LIST_RE.search(fm)
            if tl2:
                tags = [line.strip().lstrip("- ").strip()
                        for line in tl2.group(1).splitlines() if line.strip()]

        status_m = STATUS_LINE_RE.search(fm)
        status = status_m.group(1).strip() if status_m else ""

        type_m = TYPE_LINE_RE.search(fm)
        note_type = type_m.group(1).strip() if type_m else ""

        # Collect existing wikilinks in body
        existing_links = {m.group(1).split("|")[0].split("#")[0].strip()
                          for m in WIKILINK_RE.finditer(body)}

        notes.append(Note(
            path=p, rel=p.relative_to(VAULT), raw=raw,
            fm=fm, body=body, title=title,
            tags=[t for t in tags if t],
            status=status, note_type=note_type,
            existing_links=existing_links,
        ))
    return notes


def build_title_index(notes: list[Note]) -> dict[str, Note]:
    """Map display title (case-folded) → Note. Prefer longer titles on collision."""
    index: dict[str, Note] = {}
    for note in notes:
        key = note.title.casefold()
        if key not in index or len(note.title) > len(index[key].title):
            index[key] = note
    return index


# ── Step 1: Verbatim title links ─────────────────────────────────────────────

def _protect_wikilinks(text: str) -> tuple[str, list[str]]:
    """Replace [[...]] with numbered tokens so we don't double-link."""
    tokens: list[str] = []

    def replacer(m: re.Match) -> str:
        tokens.append(m.group(0))
        return f"\x00WIKILINK{len(tokens) - 1}\x00"

    protected = WIKILINK_RE.sub(replacer, text)
    return protected, tokens


def _restore_wikilinks(text: str, tokens: list[str]) -> str:
    for i, original in enumerate(tokens):
        text = text.replace(f"\x00WIKILINK{i}\x00", original)
    return text


def step1_title_links(
    notes: list[Note],
    title_index: dict[str, Note],
    dry_run: bool = True,
) -> dict[Path, int]:
    """Scan note bodies for plain-text mentions of other titles → wrap in [[...]]."""
    changes: dict[Path, int] = {}

    # Sort titles longest-first so we match "Pydantic 2.x Notes" before "Pydantic"
    candidates = sorted(
        [(t, n) for t, n in title_index.items() if len(t) >= MIN_TITLE_LEN],
        key=lambda x: -len(x[0]),
    )

    for note in notes:
        # Protect existing wikilinks from being re-processed
        protected_body, tokens = _protect_wikilinks(note.body)
        new_body = protected_body
        link_count = 0

        for _title_key, target in candidates:
            # Don't self-link
            if target.path == note.path:
                continue
            # Already has a wikilink to this target
            if target.title in note.existing_links:
                continue

            display = target.title
            pattern = re.compile(
                r"\b" + re.escape(display) + r"\b",
                re.IGNORECASE,
            )

            new_body_candidate = pattern.sub(f"[[{display}]]", new_body, count=1)
            if new_body_candidate != new_body:
                new_body = new_body_candidate
                link_count += 1

        if link_count > 0:
            final_body = _restore_wikilinks(new_body, tokens)
            changes[note.path] = link_count
            if not dry_run:
                # Reconstruct full file
                if note.fm:
                    new_content = f"---\n{note.fm}\n---\n{final_body}"
                else:
                    new_content = final_body
                note.path.write_text(new_content, encoding="utf-8")
                # Update in-memory
                note.body = final_body
                note.raw = new_content

    return changes


# ── Step 2: related: frontmatter ─────────────────────────────────────────────

def step2_related_fm(
    notes: list[Note],
    dry_run: bool = True,
) -> dict[Path, list[str]]:
    """For notes sharing 2+ non-common tags with no existing link, add related:."""
    changes: dict[Path, list[str]] = {}

    # Build tag → notes map
    tag_to_notes: dict[str, list[Note]] = defaultdict(list)
    for note in notes:
        for tag in note.tags:
            if tag and tag not in COMMON_TAGS:
                tag_to_notes[tag].append(note)

    # For each note, find notes sharing 2+ tags
    for note in notes:
        if note.status == "stub":
            continue
        meaningful_tags = [t for t in note.tags if t not in COMMON_TAGS]
        if len(meaningful_tags) < 2:
            continue

        # Count shared tags per other note
        shared: dict[Path, int] = Counter()
        for tag in meaningful_tags:
            for other in tag_to_notes[tag]:
                if other.path != note.path:
                    shared[other.path] += 1

        related_titles = []
        for other_path, count in shared.items():
            if count < 2:
                continue
            # Find the other note object
            other = next((n for n in notes if n.path == other_path), None)
            if other is None:
                continue
            # Skip if already linked inline
            if other.title in note.existing_links or note.title in other.existing_links:
                continue
            # Skip if already in related: fm
            if RELATED_LINE_RE.search(note.fm) and other.title in note.fm:
                continue
            related_titles.append(other.title)

        # Deduplicate by title (two notes with same frontmatter title)
        seen_titles: set[str] = set()
        deduped: list[str] = []
        for t in related_titles:
            if t.casefold() not in seen_titles:
                seen_titles.add(t.casefold())
                deduped.append(t)

        if deduped:
            changes[note.path] = deduped[:5]  # cap at 5 per note
            if not dry_run:
                _add_related_to_note(note, deduped[:5])

    return changes


def _add_related_to_note(note: Note, titles: list[str]) -> None:
    """Inject or extend `related:` in frontmatter."""
    entries = "\n".join(f'  - "[[{t}]]"' for t in titles)
    existing_m = RELATED_LINE_RE.search(note.fm)

    if existing_m:
        # Append to existing related block
        new_fm = note.fm[:existing_m.end()] + "\n" + entries
    else:
        # Add before closing ---
        new_fm = note.fm.rstrip() + f"\nrelated:\n{entries}"

    if note.fm:
        new_content = f"---\n{new_fm}\n---\n{note.body}"
    else:
        new_content = note.body
    note.path.write_text(new_content, encoding="utf-8")
    note.fm = new_fm
    note.raw = new_content


# ── Step 3: Stub node creation ────────────────────────────────────────────────

# Concepts to watch for in the corpus (derived from tag vocab + common topic words)
WATCHLIST = [
    "Temporal", "LangGraph", "LangChain", "RAG", "vector search",
    "embeddings", "pydantic-ai", "structlog", "OpenTelemetry",
    "Behavioral Interview", "system design", "STAR method",
    "Obsidian Web Clipper", "Smart Connections",
    "BCTCI", "Pathrise", "FBA", "Amazon FBA",
    "Excalidraw", "Dataview", "Kanban",
]


def step3_stubs(
    notes: list[Note],
    title_index: dict[str, Note],
    dry_run: bool = True,
) -> list[tuple[str, int, Path]]:
    """Find watchlist concepts mentioned 3+ times with no dedicated note → create stubs."""
    all_text = "\n".join(n.body for n in notes)
    to_create: list[tuple[str, int, Path]] = []

    for concept in WATCHLIST:
        key = concept.casefold()
        if key in title_index:
            continue  # already has a note
        # Count occurrences (word boundary)
        pattern = re.compile(r"\b" + re.escape(concept) + r"\b", re.IGNORECASE)
        count = len(pattern.findall(all_text))
        if count >= STUB_THRESHOLD:
            # Determine best folder
            stub_path = _stub_path(concept)
            to_create.append((concept, count, stub_path))

    if not dry_run:
        for concept, count, stub_path in to_create:
            _write_stub(concept, stub_path)

    return to_create


def _stub_path(concept: str) -> Path:
    """Map a concept to an appropriate vault path for a stub note."""
    concept_lower = concept.lower()
    if any(w in concept_lower for w in ["langchain", "langgraph", "temporal", "rag",
                                         "vector", "embedding", "pydantic-ai", "opentelemetry"]):
        return VAULT / "Development" / f"{concept}.md"
    if any(w in concept_lower for w in ["behavioral", "star method", "bctci", "system design"]):
        return VAULT / "Job Search" / f"{concept}.md"
    if any(w in concept_lower for w in ["obsidian", "excalidraw", "dataview", "kanban",
                                         "smart connections"]):
        return VAULT / "Development" / f"{concept}.md"
    if any(w in concept_lower for w in ["pathrise"]):
        return VAULT / "Pathrise" / f"{concept}.md"
    if any(w in concept_lower for w in ["fba", "amazon"]):
        return VAULT / "FBA" / f"{concept}.md"
    return VAULT / f"{concept}.md"


def _write_stub(concept: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = f"""---
title: "{concept}"
type: note
tags: []
status: stub
created: 2026-04-21
description: "Stub — mentioned {STUB_THRESHOLD}+ times in vault, needs a dedicated note."
---

*Stub note — add content here.*
"""
    path.write_text(content, encoding="utf-8")


# ── Step 4: Job pipeline cross-links ─────────────────────────────────────────

def step4_job_pipeline(
    notes: list[Note],
    title_index: dict[str, Note],
    dry_run: bool = True,
) -> dict[Path, list[str]]:
    """Each Pipeline/{Company}/ note → link to Behavioral Interviewing + resume notes."""
    changes: dict[Path, list[str]] = {}

    # Find behavioral interviewing note — may be inside a Behavioral Interviewing/ folder
    behavioral = title_index.get(BEHAVIORAL_NOTE.casefold())
    if behavioral is None:
        # Fallback: find any note whose path contains "Behavioral Interviewing"
        behavioral = next(
            (n for n in notes
             if "behavioral interviewing" in str(n.rel).casefold()
             and JOB_PIPELINE_DIR.lower() not in str(n.rel).lower()),
            None,
        )
    # Find resume notes
    resume_notes = [
        n for n in notes
        if "resume" in n.title.casefold() or "resume" in str(n.rel).casefold()
    ]

    pipeline_notes = [
        n for n in notes
        if JOB_PIPELINE_DIR.lower() in str(n.rel).lower()
    ]

    for note in pipeline_notes:
        to_add: list[str] = []

        if behavioral and behavioral.title not in note.existing_links:
            to_add.append(behavioral.title)

        for resume in resume_notes[:2]:  # top 2 resume notes
            if resume.title not in note.existing_links and resume.path != note.path:
                to_add.append(resume.title)

        if to_add:
            changes[note.path] = to_add
            if not dry_run:
                # Append a "See also" section at end of body
                see_also = "\n\n## See also\n" + "\n".join(
                    f"- [[{t}]]" for t in to_add
                )
                new_raw = note.raw.rstrip() + see_also + "\n"
                note.path.write_text(new_raw, encoding="utf-8")

    return changes


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 4 — Wikilink construction")
    parser.add_argument(
        "--apply", action="store_true",
        help="Apply changes (default is dry-run report only)"
    )
    parser.add_argument(
        "--step", type=int, choices=[1, 2, 3, 4], default=0,
        help="Run only a specific step (default: all)"
    )
    args = parser.parse_args()
    dry_run = not args.apply

    print(f"Loading notes from: {VAULT}")
    notes = load_notes()
    print(f"Loaded {len(notes)} notes")
    title_index = build_title_index(notes)
    print(f"Title index: {len(title_index)} entries")
    print(f"Mode: {'DRY RUN' if dry_run else 'APPLY'}\n")

    run_all = args.step == 0

    # Step 1
    if run_all or args.step == 1:
        print("=" * 60)
        print("Step 1: Verbatim title links")
        print("=" * 60)
        changes = step1_title_links(notes, title_index, dry_run=dry_run)
        total_links = sum(changes.values())
        print(f"  Notes to update: {len(changes)}  |  Total new links: {total_links}")
        for path, count in sorted(changes.items(), key=lambda x: -x[1])[:20]:
            print(f"    +{count} links  {path.relative_to(VAULT)}")
        if len(changes) > 20:
            print(f"    ... and {len(changes) - 20} more")
        print()

    # Step 2
    if run_all or args.step == 2:
        print("=" * 60)
        print("Step 2: related: frontmatter")
        print("=" * 60)
        changes2 = step2_related_fm(notes, dry_run=dry_run)
        print(f"  Notes to update: {len(changes2)}")
        for path, titles in sorted(changes2.items())[:20]:
            rel = path.relative_to(VAULT)
            print(f"    {rel}")
            for t in titles:
                print(f"      → [[{t}]]")
        if len(changes2) > 20:
            print(f"    ... and {len(changes2) - 20} more")
        print()

    # Step 3
    if run_all or args.step == 3:
        print("=" * 60)
        print("Step 3: Stub node creation")
        print("=" * 60)
        stubs = step3_stubs(notes, title_index, dry_run=dry_run)
        print(f"  Stubs to create: {len(stubs)}")
        for concept, count, path in sorted(stubs, key=lambda x: -x[1]):
            print(f"    [{count}x] {concept!r}  →  {path.relative_to(VAULT)}")
        print()

    # Step 4
    if run_all or args.step == 4:
        print("=" * 60)
        print("Step 4: Job pipeline cross-links")
        print("=" * 60)
        changes4 = step4_job_pipeline(notes, title_index, dry_run=dry_run)
        print(f"  Pipeline notes to update: {len(changes4)}")
        for path, titles in sorted(changes4.items()):
            rel = path.relative_to(VAULT)
            print(f"    {rel}")
            for t in titles:
                print(f"      → [[{t}]]")
        print()

    if dry_run:
        print("─" * 60)
        print("DRY RUN complete. Re-run with --apply to execute changes.")


if __name__ == "__main__":
    main()
