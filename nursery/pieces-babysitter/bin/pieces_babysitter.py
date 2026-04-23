#!/usr/bin/env python3
"""
Pieces OS Babysitter
====================
- Launches Pieces OS if not running at boot
- Health checks every 10s to http://127.0.0.1:39300/.well-known/health
- Restarts if 3 consecutive health check failures
- Restarts if CPU > 100% sustained for 120s
- Sends macOS notification the moment CPU first hits 120s sustained threshold
- Escalation per attempt: /os/restart -> SIGTERM+relaunch -> SIGKILL+relaunch
- Gives up after 5 restart attempts and sends macOS alert
- Resets restart counter after 10 min of clean uptime
- Kills all existing instances before launching to prevent duplicate menu bar icons
"""

import subprocess, time, signal, logging, os, sys
from datetime import datetime
from pathlib import Path
import urllib.request, urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
APP_BINARY          = "/Applications/Pieces OS.app/Contents/MacOS/Pieces OS"
BASE_URL            = "http://127.0.0.1:39300"
HEALTH_URL          = f"{BASE_URL}/.well-known/health"
RESTART_URL         = f"{BASE_URL}/os/restart"
HEALTH_INTERVAL     = 10      # seconds between health checks
CPU_POLL_INTERVAL   = 10      # seconds between CPU samples
CPU_THRESHOLD       = 100.0   # percent
CPU_SUSTAINED_SECS  = 120     # seconds over threshold before restart
HEALTH_FAIL_LIMIT   = 3       # consecutive failures before restart
RESTART_WAIT        = 30      # seconds to wait after /os/restart
MAX_RESTARTS        = 5       # give up threshold
CLEAN_UPTIME_RESET  = 600     # reset restart counter after 10 min clean
STARTUP_GRACE_SECS  = 90      # suppress health-check restarts during initial boot
# ──────────────────────────────────────────────────────────────────────────────

LOG_DIR  = Path.home() / "Library/Logs/PiecesOS"
LOG_FILE = LOG_DIR / "babysitter.log"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("babysitter")
# ──────────────────────────────────────────────────────────────────────────────


def notify(title: str, message: str) -> None:
    script = f'display notification "{message}" with title "{title}" sound name "Basso"'
    try:
        subprocess.run(["osascript", "-e", script], check=False, timeout=5)
    except Exception as e:
        log.warning(f"Notification failed: {e}")


def get_all_pids() -> list[int]:
    """Return all PIDs matching the Pieces OS binary."""
    try:
        out = subprocess.check_output(
            ["pgrep", "-f", "Pieces OS"], text=True, timeout=5
        ).strip()
        return [int(p) for p in out.splitlines() if p.strip().isdigit()]
    except subprocess.CalledProcessError:
        return []
    except Exception as e:
        log.warning(f"pgrep error: {e}")
        return []


def get_pid() -> int | None:
    pids = get_all_pids()
    return pids[0] if pids else None


def kill_all_instances(reason: str = "") -> None:
    """
    Kill every running Pieces OS process before launching a fresh one.
    Prevents duplicate menu bar icons from stale or slow-dying instances.
    Uses SIGTERM first, escalates to SIGKILL after 10s if needed.
    """
    pids = get_all_pids()
    if not pids:
        return
    log.info(f"Killing {len(pids)} existing Pieces OS instance(s) {pids}{' — ' + reason if reason else ''}")
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        except Exception as e:
            log.warning(f"SIGTERM failed for PID {pid}: {e}")
    # Give them up to 10s to exit gracefully
    deadline = time.time() + 10
    while time.time() < deadline:
        if not get_all_pids():
            log.info("All instances exited cleanly.")
            return
        time.sleep(1)
    # Anything still alive gets SIGKILL
    stragglers = get_all_pids()
    if stragglers:
        log.warning(f"Force-killing {stragglers} with SIGKILL")
        for pid in stragglers:
            try:
                os.kill(pid, signal.SIGKILL)
            except Exception:
                pass
        time.sleep(2)


def get_cpu(pid: int) -> float | None:
    try:
        out = subprocess.check_output(
            ["ps", "-p", str(pid), "-o", "%cpu="], text=True, timeout=5
        ).strip()
        return float(out) if out else None
    except Exception:
        return None


def http_get(url: str, timeout: int = 8) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except Exception as e:
        return -1, str(e)


def launch_process() -> None:
    log.info(f"Launching: {APP_BINARY}")
    proc = subprocess.Popen(
        [APP_BINARY],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    log.info(f"Launched PID {proc.pid}")


def wait_for_startup(timeout: int = 60) -> bool:
    """Poll health endpoint until healthy or timeout expires."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        code, _ = http_get(HEALTH_URL)
        if code == 200:
            return True
        time.sleep(2)
    return False


def try_api_restart() -> bool:
    log.info("Requesting API restart via /os/restart ...")
    http_get(RESTART_URL)
    time.sleep(RESTART_WAIT)
    code, _ = http_get(HEALTH_URL)
    if code == 200:
        log.info("API restart succeeded — service healthy.")
        return True
    log.warning("API restart did not restore health.")
    return False


def kill_and_relaunch(pid: int | None, sig: int) -> bool:
    sig_name = {signal.SIGTERM: "SIGTERM", signal.SIGKILL: "SIGKILL"}.get(sig, str(sig))
    if pid:
        log.info(f"Sending {sig_name} to PID {pid}")
        try:
            os.kill(pid, sig)
        except ProcessLookupError:
            log.info("Process already gone before signal.")
    for _ in range(15):
        time.sleep(2)
        if get_pid() != pid:
            break
    # Ensure ALL instances are gone before spawning a fresh one
    kill_all_instances(reason=f"pre-relaunch cleanup after {sig_name}")
    launch_process()
    time.sleep(5)
    return wait_for_startup(timeout=60)


def escalated_restart(pid: int | None, attempt: int) -> bool:
    log.warning(f"=== Restart attempt {attempt}/{MAX_RESTARTS} ===")
    if try_api_restart():
        return True
    log.warning("Escalating to SIGTERM ...")
    if kill_and_relaunch(pid, signal.SIGTERM):
        log.info("SIGTERM + relaunch restored health.")
        return True
    log.warning("Escalating to SIGKILL ...")
    new_pid = get_pid()
    if kill_and_relaunch(new_pid, signal.SIGKILL):
        log.info("SIGKILL + relaunch restored health.")
        return True
    log.error("All escalation steps failed for this attempt.")
    return False


def main() -> None:
    log.info("Pieces OS Babysitter starting ...")

    # Kill any stale instances from a previous session before launching fresh
    kill_all_instances(reason="startup cleanup")

    launch_process()
    log.info(f"Waiting up to {STARTUP_GRACE_SECS}s for Pieces OS to become healthy ...")
    if not wait_for_startup(timeout=STARTUP_GRACE_SECS):
        log.error("Pieces OS failed to become healthy within startup grace period.")
    else:
        log.info("Pieces OS healthy at startup.")

    restart_count           = 0
    health_fail_streak      = 0
    cpu_over_since: datetime | None = None
    cpu_spike_notified      = False
    last_clean_time         = datetime.now()
    last_health_check       = 0.0
    startup_time            = time.time()

    while True:
        now = time.time()
        in_startup_grace = (now - startup_time) < STARTUP_GRACE_SECS

        # ── Health check ───────────────────────────────────────────────────────
        if now - last_health_check >= HEALTH_INTERVAL:
            last_health_check = now
            code, body = http_get(HEALTH_URL)
            if code == 200:
                health_fail_streak = 0
                log.debug("Health OK")
            else:
                health_fail_streak += 1
                log.warning(
                    f"Health check failed ({health_fail_streak}/{HEALTH_FAIL_LIMIT}): "
                    f"HTTP {code} — {body[:120]}"
                )
                if health_fail_streak >= HEALTH_FAIL_LIMIT:
                    if in_startup_grace:
                        log.info(
                            f"Health failures during startup grace period "
                            f"({int(now - startup_time)}s / {STARTUP_GRACE_SECS}s) — holding off restart."
                        )
                        health_fail_streak = 0  # reset so we keep checking without triggering restart
                    else:
                        log.error("Health fail limit reached — initiating restart.")
                        health_fail_streak  = 0
                        cpu_over_since      = None
                        cpu_spike_notified  = False
                        pid = get_pid()
                        restart_count += 1
                        if restart_count > MAX_RESTARTS:
                            msg = f"Pieces OS unresponsive after {MAX_RESTARTS} restart attempts."
                            log.critical(msg)
                            notify("Pieces OS — CRITICAL", msg)
                            sys.exit(1)
                        if escalated_restart(pid, restart_count):
                            last_clean_time = datetime.now()


        # ── CPU monitoring ─────────────────────────────────────────────────────
        pid = get_pid()
        if pid is None:
            if not in_startup_grace:
                log.warning("Pieces OS process not found — relaunching.")
                kill_all_instances(reason="process vanished")
                launch_process()
                wait_for_startup(60)
            cpu_over_since     = None
            cpu_spike_notified = False
        else:
            cpu = get_cpu(pid)
            if cpu is not None:
                if cpu > CPU_THRESHOLD:
                    if cpu_over_since is None:
                        cpu_over_since     = datetime.now()
                        cpu_spike_notified = False
                        log.warning(f"CPU spike started: {cpu:.1f}%")
                    elapsed = (datetime.now() - cpu_over_since).total_seconds()
                    log.info(f"CPU {cpu:.1f}% — over threshold for {int(elapsed)}s")

                    if elapsed >= CPU_SUSTAINED_SECS and not cpu_spike_notified:
                        cpu_spike_notified = True
                        ts = datetime.now().strftime("%H:%M:%S")
                        notify(
                            "Pieces OS — High CPU",
                            f"CPU > {CPU_THRESHOLD:.0f}% for {int(elapsed)}s at {ts}. Restarting..."
                        )
                        log.warning(f"CPU spike alert sent ({int(elapsed)}s sustained).")

                    if elapsed >= CPU_SUSTAINED_SECS:
                        log.error(f"CPU > {CPU_THRESHOLD}% for {elapsed:.0f}s — restarting.")
                        cpu_over_since     = None
                        cpu_spike_notified = False
                        restart_count     += 1
                        if restart_count > MAX_RESTARTS:
                            msg = f"Pieces OS CPU unrecoverable after {MAX_RESTARTS} attempts."
                            log.critical(msg)
                            notify("Pieces OS — CRITICAL", msg)
                            sys.exit(1)
                        if escalated_restart(pid, restart_count):
                            last_clean_time = datetime.now()
                else:
                    if cpu_over_since is not None:
                        log.info(f"CPU returned to normal: {cpu:.1f}%")
                    cpu_over_since     = None
                    cpu_spike_notified = False

        # ── Reset restart counter after 10 min clean uptime ───────────────────
        if restart_count > 0:
            if (datetime.now() - last_clean_time).total_seconds() >= CLEAN_UPTIME_RESET:
                log.info("10 min clean uptime — resetting restart counter.")
                restart_count = 0

        time.sleep(CPU_POLL_INTERVAL)


if __name__ == "__main__":
    main()
