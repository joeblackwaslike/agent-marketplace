#!/usr/bin/env python3
"""Phase 5 — Folder Restructure.

Executes approved moves, then scans all notes for path-based wikilinks
that reference moved files and updates them to title-only [[Note Title]] form.
"""

from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

VAULT = Path(os.path.expanduser(
    "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault"
))

# ---------------------------------------------------------------------------
# Move plan — (source_relative, dest_relative)
# All paths relative to vault root.
# ---------------------------------------------------------------------------

def build_move_plan() -> list[tuple[Path, Path]]:
    moves: list[tuple[Path, Path]] = []

    # ── Group A: Pathrise/ → Job Search/Pathrise/ ───────────────────────────
    src_dir = VAULT / "Pathrise"
    for p in sorted(src_dir.rglob("*.md")):
        rel = p.relative_to(src_dir)
        moves.append((p, VAULT / "Job Search" / "Pathrise" / rel))

    # ── Group B: Clippings/Pathrise* → Job Search/Pathrise/ ─────────────────
    clippings = VAULT / "Clippings"
    for p in sorted(clippings.glob("*.md")):
        if p.stem.lower().startswith("pathrise"):
            moves.append((p, VAULT / "Job Search" / "Pathrise" / p.name))

    # ── Group C: Development/Python/ → Development/ ─────────────────────────
    py_dir = VAULT / "Development" / "Python"
    for p in sorted(py_dir.rglob("*.md")):
        moves.append((p, VAULT / "Development" / p.name))

    # ── Group D: Development/APIs/ → Development/ ───────────────────────────
    api_dir = VAULT / "Development" / "APIs"
    for p in sorted(api_dir.rglob("*.md")):
        moves.append((p, VAULT / "Development" / p.name))

    # ── Group E: Development/Databases/ → Development/ ──────────────────────
    db_dir = VAULT / "Development" / "Databases"
    for p in sorted(db_dir.rglob("*.md")):
        moves.append((p, VAULT / "Development" / p.name))

    # ── Group F: Root-level → organised homes ────────────────────────────────
    root_moves: dict[str, Path] = {
        "Agent Discord Setup Guide.md":               VAULT / "Development" / "AI" / "Agent Discord Setup Guide.md",
        "Agent Memory by Provider.md":                VAULT / "Development" / "AI" / "Agent Memory by Provider.md",
        "Context management.md":                      VAULT / "Development" / "AI" / "Context management.md",
        "Github AI features Mapped.md":               VAULT / "Development" / "AI" / "Github AI features Mapped.md",
        "Improving the agent verification layer.md":  VAULT / "Development" / "AI" / "Improving the agent verification layer.md",
        "Multi-Agent LLM Failure Mode Taxonomy.md":   VAULT / "Development" / "AI" / "Multi-Agent LLM Failure Mode Taxonomy.md",
        "Prompt & Context Engineering.md":            VAULT / "Development" / "AI" / "Prompt & Context Engineering.md",
        "cc exploration.md":                          VAULT / "Development" / "AI" / "cc exploration.md",
        "Obsidian Tips.md":                           VAULT / "Development" / "Obsidian Tips" / "Obsidian Tips.md",
        "Obsidian Renovation & Integration Project.md": VAULT / "_meta" / "Obsidian Renovation & Integration Project.md",
        "Disability Application.md":                  VAULT / "Personal Notes" / "Disability Application.md",
        "High leverage insights.md":                  VAULT / "Personal Notes" / "High leverage insights.md",
        "Extension Spec Prompt.md":                   VAULT / "Development" / "Extension Spec Prompt.md",
        "Pino prompt.md":                             VAULT / "copilot" / "copilot-custom-prompts" / "Pino prompt.md",
        "Solution Judging Prompt.md":                 VAULT / "copilot" / "copilot-custom-prompts" / "Solution Judging Prompt.md",
        "Million dollar ideas.md":                    VAULT / "Ideas" / "Million dollar ideas.md",
        "mill ideas.md":                              VAULT / "Ideas" / "mill ideas.md",
        "Resellar platform PRD.md":                   VAULT / "Ideas" / "Resellar platform PRD.md",
        "jobs api.md":                                VAULT / "Job Search" / "Dev Projects" / "jobs api.md",
    }
    for name, dest in root_moves.items():
        src = VAULT / name
        if src.exists():
            moves.append((src, dest))

    return moves


# ---------------------------------------------------------------------------
# Wikilink path-repair
# ---------------------------------------------------------------------------

PATH_WIKILINK_RE = re.compile(r"\[\[([^\]|]+/[^\]|]+?)(\|[^\]]+)?\]\]")


def repair_path_wikilinks(moved: dict[Path, Path]) -> dict[Path, int]:
    """
    Scan all notes for [[path/to/Note]] style wikilinks referencing moved files.
    Replace with [[Note Title]] (title-only). Returns {file: count_fixed}.
    """
    # Build old-stem → new-title map
    stem_map: dict[str, str] = {}
    for old, new in moved.items():
        stem_map[old.stem.casefold()] = new.stem

    fixes: dict[Path, int] = {}

    for p in sorted(VAULT.rglob("*.md")):
        if any(part.startswith(".") for part in p.relative_to(VAULT).parts):
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        count = 0

        def replacer(m: re.Match) -> str:
            nonlocal count
            raw_path = m.group(1)
            alias = m.group(2) or ""
            stem = Path(raw_path).stem.casefold()
            if stem in stem_map:
                count += 1
                return f"[[{stem_map[stem]}{alias}]]"
            return m.group(0)

        new_text = PATH_WIKILINK_RE.sub(replacer, text)
        if count > 0:
            p.write_text(new_text, encoding="utf-8")
            fixes[p] = count

    return fixes


# ---------------------------------------------------------------------------
# Empty-folder cleanup
# ---------------------------------------------------------------------------

def remove_empty_dirs(roots: list[Path]) -> list[Path]:
    """Remove dirs that are empty (or contain only other empty dirs)."""
    removed: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        # Walk bottom-up
        for dirpath, dirs, files in os.walk(root, topdown=False):
            dp = Path(dirpath)
            # Skip hidden dirs
            if any(part.startswith(".") for part in dp.relative_to(VAULT).parts):
                continue
            if not any(dp.iterdir()):
                dp.rmdir()
                removed.append(dp)
    return removed


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    moves = build_move_plan()

    print(f"Vault: {VAULT}")
    print(f"Total moves: {len(moves)}\n")

    moved: dict[Path, Path] = {}
    skipped = 0
    errors = 0

    for src, dst in moves:
        if not src.exists():
            print(f"  SKIP (missing): {src.relative_to(VAULT)}")
            skipped += 1
            continue
        if dst.exists():
            print(f"  SKIP (exists):  {dst.relative_to(VAULT)}")
            skipped += 1
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.move(str(src), str(dst))
            print(f"  MOVE: {src.relative_to(VAULT)}")
            print(f"     → {dst.relative_to(VAULT)}")
            moved[src] = dst
        except Exception as e:
            print(f"  ERROR: {src.relative_to(VAULT)}: {e}")
            errors += 1

    print(f"\nMoved: {len(moved)}  |  Skipped: {skipped}  |  Errors: {errors}")

    # Repair path-based wikilinks
    print("\nScanning for path-based wikilinks to repair...")
    fixes = repair_path_wikilinks(moved)
    total_fixed = sum(fixes.values())
    print(f"  Fixed {total_fixed} path-wikilinks across {len(fixes)} notes")
    for p, count in sorted(fixes.items()):
        print(f"    +{count}  {p.relative_to(VAULT)}")

    # Clean up empty source dirs
    source_roots = [
        VAULT / "Pathrise",
        VAULT / "Development" / "Python",
        VAULT / "Development" / "APIs",
        VAULT / "Development" / "Databases",
    ]
    removed = remove_empty_dirs(source_roots)
    if removed:
        print(f"\nRemoved {len(removed)} empty directories:")
        for d in removed:
            print(f"  {d.relative_to(VAULT)}")

    print("\nPhase 5 complete.")


if __name__ == "__main__":
    main()
