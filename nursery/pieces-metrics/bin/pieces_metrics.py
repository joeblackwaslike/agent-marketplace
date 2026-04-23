#!/usr/bin/env python3
"""
Pieces OS Metrics Collector
============================
Samples process metrics every 30 seconds and writes to SQLite.

Columns:
  timestamp        - ISO8601 UTC
  pid              - process ID
  cpu_percent      - instantaneous CPU% from ps
  mem_rss_mb       - resident set size in MB
  mem_vsz_mb       - virtual memory size in MB
  thread_count     - thread count (ps -M, macOS-native)
  open_files       - open file descriptors (lsof)
  cpu_user_secs    - cumulative user CPU seconds
  cpu_sys_secs     - cumulative system CPU seconds
  process_age_secs - elapsed seconds since process start
  health_status    - HTTP status from /health (200 or -1)
  restart_count    - total restarts parsed from babysitter.stdout.log
"""

import subprocess, sqlite3, time, sys, re, logging
import urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SAMPLE_INTERVAL = 30
HEALTH_URL      = "http://127.0.0.1:39300/.well-known/health"
LOG_DIR         = Path.home() / "Library/Logs/PiecesOS"
DB_PATH         = LOG_DIR / "metrics.db"
LOG_FILE        = LOG_DIR / "metrics.log"
BABYSITTER_LOG  = LOG_DIR / "babysitter.stdout.log"  # actual log written by launchd
# ──────────────────────────────────────────────────────────────────────────────

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("metrics")


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS process_metrics (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp        TEXT    NOT NULL,
            pid              INTEGER,
            cpu_percent      REAL,
            mem_rss_mb       REAL,
            mem_vsz_mb       REAL,
            thread_count     INTEGER,
            open_files       INTEGER,
            cpu_user_secs    REAL,
            cpu_sys_secs     REAL,
            process_age_secs REAL,
            health_status    INTEGER,
            restart_count    INTEGER
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ts ON process_metrics(timestamp)")
    conn.commit()


def get_pid() -> int | None:
    try:
        out = subprocess.check_output(
            ["pgrep", "-f", "Pieces OS"], text=True, timeout=5
        ).strip()
        pids = [int(p) for p in out.splitlines() if p.strip().isdigit()]
        return pids[0] if pids else None
    except Exception:
        return None


def parse_etime(etime: str) -> float | None:
    """Parse ps etime [[dd-]hh:]mm:ss -> total seconds."""
    try:
        etime = etime.strip()
        days = 0
        if "-" in etime:
            d, etime = etime.split("-", 1)
            days = int(d)
        parts = [int(x) for x in etime.split(":")]
        if len(parts) == 3:
            h, m, s = parts
        elif len(parts) == 2:
            h, m, s = 0, parts[0], parts[1]
        else:
            return None
        return days * 86400 + h * 3600 + m * 60 + s
    except Exception:
        return None


def parse_ps_time(t: str) -> float | None:
    """Parse ps utime/stime mm:ss.ss -> seconds."""
    try:
        parts = t.strip().split(":")
        return int(parts[0]) * 60 + float(parts[1]) if len(parts) == 2 else float(t)
    except Exception:
        return None


def get_thread_count(pid: int) -> int | None:
    """
    Get thread count on macOS using `ps -M -p <pid>`.
    `ps -M` prints one line per thread; subtract 1 for the header row.
    """
    try:
        out = subprocess.check_output(
            ["ps", "-M", "-p", str(pid)],
            text=True, stderr=subprocess.DEVNULL, timeout=5
        ).strip()
        lines = [l for l in out.splitlines() if l.strip()]
        # First line is header, remaining lines are threads
        return max(0, len(lines) - 1)
    except Exception as e:
        log.debug(f"thread_count error: {e}")
        return None


def ps_metrics(pid: int) -> dict:
    result = dict(cpu_percent=None, mem_rss_mb=None, mem_vsz_mb=None,
                  thread_count=None, process_age_secs=None,
                  cpu_user_secs=None, cpu_sys_secs=None)
    try:
        # macOS ps -o does not support nlwp; use %cpu, rss, vsz, etime only
        out = subprocess.check_output(
            ["ps", "-p", str(pid), "-o", "%cpu=,rss=,vsz=,etime="],
            text=True, timeout=5
        ).strip()
        if out:
            parts = out.split()
            if len(parts) >= 3:
                result["cpu_percent"] = float(parts[0])
                result["mem_rss_mb"]  = int(parts[1]) / 1024.0
                result["mem_vsz_mb"]  = int(parts[2]) / 1024.0
            if len(parts) >= 4:
                result["process_age_secs"] = parse_etime(parts[3])
    except Exception as e:
        log.debug(f"ps_metrics error: {e}")

    # Thread count via separate macOS-native call
    result["thread_count"] = get_thread_count(pid)

    try:
        out2 = subprocess.check_output(
            ["ps", "-p", str(pid), "-o", "utime=,stime="],
            text=True, timeout=5
        ).strip()
        if out2:
            t = out2.split()
            if len(t) >= 2:
                result["cpu_user_secs"] = parse_ps_time(t[0])
                result["cpu_sys_secs"]  = parse_ps_time(t[1])
    except Exception as e:
        log.debug(f"cpu time parse error: {e}")

    return result


def count_open_files(pid: int) -> int | None:
    try:
        out = subprocess.check_output(
            ["lsof", "-p", str(pid)],
            text=True, stderr=subprocess.DEVNULL, timeout=10
        )
        return max(0, len(out.strip().splitlines()) - 1)
    except Exception:
        return None


def check_health() -> int:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=8) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return -1


def parse_restart_count() -> int:
    if not BABYSITTER_LOG.exists():
        return 0
    try:
        pattern = re.compile(r"=== Restart attempt \d+/\d+ ===")
        return sum(1 for line in open(BABYSITTER_LOG, errors="replace") if pattern.search(line))
    except Exception:
        return 0


def collect_sample(pid: int | None) -> dict:
    ts       = datetime.now(timezone.utc).isoformat(timespec="seconds")
    health   = check_health()
    restarts = parse_restart_count()

    if pid is None:
        return dict(timestamp=ts, pid=None, cpu_percent=None, mem_rss_mb=None,
                    mem_vsz_mb=None, thread_count=None, open_files=None,
                    cpu_user_secs=None, cpu_sys_secs=None, process_age_secs=None,
                    health_status=health, restart_count=restarts)

    m = ps_metrics(pid)
    return dict(timestamp=ts, pid=pid,
                cpu_percent=m["cpu_percent"], mem_rss_mb=m["mem_rss_mb"],
                mem_vsz_mb=m["mem_vsz_mb"], thread_count=m["thread_count"],
                open_files=count_open_files(pid),
                cpu_user_secs=m["cpu_user_secs"], cpu_sys_secs=m["cpu_sys_secs"],
                process_age_secs=m["process_age_secs"],
                health_status=health, restart_count=restarts)


def insert_sample(conn: sqlite3.Connection, s: dict) -> None:
    conn.execute("""
        INSERT INTO process_metrics (
            timestamp, pid, cpu_percent, mem_rss_mb, mem_vsz_mb,
            thread_count, open_files, cpu_user_secs, cpu_sys_secs,
            process_age_secs, health_status, restart_count
        ) VALUES (
            :timestamp, :pid, :cpu_percent, :mem_rss_mb, :mem_vsz_mb,
            :thread_count, :open_files, :cpu_user_secs, :cpu_sys_secs,
            :process_age_secs, :health_status, :restart_count
        )
    """, s)
    conn.commit()


def main() -> None:
    log.info(f"Metrics collector starting — DB: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    init_db(conn)

    while True:
        pid    = get_pid()
        sample = collect_sample(pid)
        insert_sample(conn, sample)
        if sample["pid"]:
            rss     = sample["mem_rss_mb"] or 0.0
            threads = sample["thread_count"] or "?"
            fds     = sample["open_files"] or "?"
            cpu     = sample["cpu_percent"]
            log.info(
                f"pid={sample['pid']} cpu={cpu} "
                f"rss={rss:.1f}MB threads={threads} "
                f"fds={fds} health={sample['health_status']}"
            )
        else:
            log.info("Process not running — null sample recorded.")
        time.sleep(SAMPLE_INTERVAL)


if __name__ == "__main__":
    main()
