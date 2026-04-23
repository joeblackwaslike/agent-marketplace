"""Watchdog daemon — monitors Clippings/ and ingests new notes into _wiki/.

Run:   uv run python src/watcher.py
Stop:  Ctrl-C (or launchd will restart it automatically)
"""

from __future__ import annotations

import time
from pathlib import Path

import structlog
import typer
from watchdog.events import FileCreatedEvent, FileSystemEventHandler
from watchdog.observers import Observer

from ingest import VAULT, ingest_note

log = structlog.get_logger()
app = typer.Typer(pretty_exceptions_enable=False)

CLIPPINGS_DIR = VAULT / "Clippings"

# Wait after detecting a new file before ingesting — lets the clipper finish writing
SETTLE_DELAY: float = 5.0


class ClippingsHandler(FileSystemEventHandler):
    def __init__(self, settle: float = SETTLE_DELAY) -> None:
        self._settle = settle

    def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() != ".md":
            return
        if any(part.startswith(".") for part in path.parts):
            return

        log.info("new_clipping_detected", path=str(path.name))
        time.sleep(self._settle)

        # Re-check file exists and has content after settle
        if not path.exists() or path.stat().st_size == 0:
            log.warning("clipping_empty_or_gone", path=str(path.name))
            return

        ingest_note(path)


@app.command()
def main(
    settle: float = typer.Option(
        SETTLE_DELAY,
        "--settle",
        help="Seconds to wait after file creation before ingesting.",
    ),
    watch_dir: Path = typer.Option(
        CLIPPINGS_DIR,
        "--dir",
        help="Directory to watch (default: Clippings/).",
        exists=False,
    ),
) -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ]
    )

    watch_dir = watch_dir.resolve()
    if not watch_dir.exists():
        log.error("watch_dir_missing", path=str(watch_dir))
        raise typer.Exit(1)

    handler = ClippingsHandler(settle=settle)
    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=False)
    observer.start()

    log.info("watcher_started", watching=str(watch_dir))

    try:
        while observer.is_alive():
            observer.join(timeout=1)
    except KeyboardInterrupt:
        pass
    finally:
        observer.stop()
        observer.join()
        log.info("watcher_stopped")


if __name__ == "__main__":
    app()
