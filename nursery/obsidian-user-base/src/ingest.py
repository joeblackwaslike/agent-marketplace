"""Wiki ingest engine.

Single-note ingest:   uv run python src/ingest.py /path/to/note.md
Bootstrap all notes:  uv run python src/ingest.py --bootstrap
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import structlog
import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

log = structlog.get_logger()
console = Console()
app = typer.Typer(pretty_exceptions_enable=False)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
VAULT = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault"
WIKI_DIR = VAULT / "_wiki"

# claude CLI — resolved at import time so we fail fast if missing
_CLAUDE_PATH = Path(
    subprocess.run(["which", "claude"], capture_output=True, text=True).stdout.strip()
    or "claude"
)

# Bootstrap batch ordering: process these folders first
BOOTSTRAP_ORDER = [
    VAULT / "Clippings",
    VAULT / "Book Notes",
    VAULT / "Development",
    VAULT / "Job Search",
    VAULT / "Pathrise",
]

# Delay between bootstrap batches (seconds) — avoid hammering the API
BATCH_DELAY: float = 2.0


# ---------------------------------------------------------------------------
# Ingest single note
# ---------------------------------------------------------------------------

def _build_prompt(source_path: Path) -> str:
    rel = source_path.relative_to(VAULT)
    return (
        f"Ingest the vault note at this path into the wiki:\n\n"
        f"  {source_path}\n\n"
        f"(Relative vault path: {rel})\n\n"
        f"Follow every instruction in CLAUDE.md exactly. "
        f"Read the source file, identify concepts, update or create wiki articles in _wiki/, "
        f"then report: N articles updated, M articles created."
    )


def ingest_note(source_path: Path, *, dry_run: bool = False) -> bool:
    """Run claude CLI to ingest one note into the wiki. Returns True on success."""
    source_path = source_path.resolve()
    if not source_path.exists():
        log.error("source_not_found", path=str(source_path))
        return False

    prompt = _build_prompt(source_path)
    cmd = [
        str(_CLAUDE_PATH),
        "--dangerously-skip-permissions",
        "--print",
        prompt,
    ]

    log.info("ingest_start", note=str(source_path.relative_to(VAULT)))

    if dry_run:
        console.print(f"[dim]DRY RUN — would run:[/dim] {' '.join(cmd[:3])} ...")
        return True

    try:
        result = subprocess.run(
            cmd,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=300,  # 5 min per note
        )
        if result.returncode != 0:
            log.error(
                "ingest_failed",
                note=str(source_path.name),
                stderr=result.stderr[:500],
            )
            return False

        # Print Claude's report (last paragraph of output)
        output = result.stdout.strip()
        if output:
            last_para = output.split("\n\n")[-1]
            log.info("ingest_done", note=str(source_path.name), report=last_para)
        return True

    except subprocess.TimeoutExpired:
        log.error("ingest_timeout", note=str(source_path.name))
        return False


# ---------------------------------------------------------------------------
# Bootstrap: all existing notes
# ---------------------------------------------------------------------------

def _collect_bootstrap_notes() -> list[Path]:
    """Return all vault notes in bootstrap order (ordered folders first, then rest)."""
    seen: set[Path] = set()
    ordered: list[Path] = []

    for folder in BOOTSTRAP_ORDER:
        if folder.exists():
            for p in sorted(folder.rglob("*.md")):
                if not any(part.startswith(".") for part in p.parts):
                    if p not in seen:
                        seen.add(p)
                        ordered.append(p)

    # Remaining notes not in ordered folders
    for p in sorted(VAULT.rglob("*.md")):
        if any(part.startswith(".") for part in p.parts):
            continue
        if p.name.endswith(".excalidraw.md"):
            continue
        if p not in seen:
            seen.add(p)
            ordered.append(p)

    return ordered


def run_bootstrap(*, dry_run: bool = False, delay: float = BATCH_DELAY) -> None:
    """Process all existing vault notes to seed _wiki/."""
    WIKI_DIR.mkdir(parents=True, exist_ok=True)
    notes = _collect_bootstrap_notes()

    console.print(f"\n[bold]Bootstrap:[/bold] {len(notes)} notes to ingest\n")
    success = failed = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Ingesting...", total=len(notes))
        for note in notes:
            rel = str(note.relative_to(VAULT))
            progress.update(task, description=f"[cyan]{rel}[/cyan]")
            ok = ingest_note(note, dry_run=dry_run)
            if ok:
                success += 1
            else:
                failed += 1
            progress.advance(task)
            if delay and not dry_run:
                time.sleep(delay)

    console.print(
        f"\n[green]✓ {success} ingested[/green]  "
        f"[red]✗ {failed} failed[/red]"
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

@app.command()
def main(
    path: Path | None = typer.Argument(
        None,
        help="Path to vault note to ingest. Omit with --bootstrap to process all notes.",
        exists=False,
    ),
    bootstrap: bool = typer.Option(
        False, "--bootstrap", "-b",
        help="Process all existing vault notes to seed _wiki/.",
    ),
    dry_run: bool = typer.Option(
        False, "--dry-run", "-n",
        help="Print what would happen without calling claude.",
    ),
    delay: float = typer.Option(
        BATCH_DELAY, "--delay",
        help="Seconds between notes during bootstrap.",
    ),
) -> None:
    structlog.configure(
        processors=[
            structlog.dev.ConsoleRenderer(),
        ]
    )

    if bootstrap:
        run_bootstrap(dry_run=dry_run, delay=delay)
        return

    if path is None:
        console.print("[red]Provide a note path or use --bootstrap[/red]")
        raise typer.Exit(1)

    WIKI_DIR.mkdir(parents=True, exist_ok=True)
    ok = ingest_note(path, dry_run=dry_run)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    app()
