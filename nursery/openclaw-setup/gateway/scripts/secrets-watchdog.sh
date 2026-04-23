#!/bin/bash
# secrets-watchdog.sh
# Triggered by WatchPaths on gateway.err.log.
# If the last line contains a known auth-failure pattern, refresh secrets and restart.

set -euo pipefail

ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
REFRESH="$HOME/.openclaw/refresh-secrets.sh"
WATCHDOG_LOG="$HOME/.openclaw/logs/secrets-watchdog.log"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $*" | tee -a "$WATCHDOG_LOG" >&2; }

# Check last 5 lines of err log for known auth failure patterns
if tail -5 "$ERR_LOG" 2>/dev/null | grep -qE \
  "SECRETS_RELOADER_DEGRADED|required secrets are unavailable|CLAUDE_OAUTH_TOKEN.*missing|unauthorized|401"; then
  log "Auth failure detected in gateway.err.log — triggering secrets refresh"
  bash "$REFRESH" 2>&1 | while read -r line; do log "$line"; done
else
  log "WatchPaths triggered but no auth failure pattern found — skipping"
fi
