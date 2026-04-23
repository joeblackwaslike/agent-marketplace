#!/bin/bash
# env-setup.sh
# Reads CLAUDE_OAUTH_TOKEN from .secrets.env and sets it in the launchd global
# environment so all processes (including openclaw gateway) can find it.
# Triggered at login via ai.openclaw.env-setup.plist (RunAtLoad).

SECRETS="$HOME/.openclaw/.secrets.env"
LOG="$HOME/.openclaw/logs/env-setup.log"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $*" >> "$LOG" 2>/dev/null; }

if [ ! -f "$SECRETS" ]; then
  log "ERROR: $SECRETS not found — run refresh-secrets.sh first"
  exit 1
fi

TOKEN=$(grep '^export CLAUDE_OAUTH_TOKEN=' "$SECRETS" | head -1 | cut -d= -f2-)
if [ -z "$TOKEN" ]; then
  log "ERROR: CLAUDE_OAUTH_TOKEN not found in $SECRETS"
  exit 1
fi

/bin/launchctl setenv CLAUDE_OAUTH_TOKEN "$TOKEN"
log "CLAUDE_OAUTH_TOKEN set in launchd global env"
