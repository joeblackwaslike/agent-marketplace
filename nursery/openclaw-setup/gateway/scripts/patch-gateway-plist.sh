#!/bin/bash
# Patches ai.openclaw.gateway.plist whenever openclaw strips CLAUDE_OAUTH_TOKEN.
# Triggered by launchd WatchPaths whenever the plist file changes.
# Reads token from .secrets.env — never hardcoded.

set -euo pipefail

PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
SECRETS="$HOME/.openclaw/.secrets.env"
LOG="$HOME/.openclaw/logs/plist-patcher.log"

mkdir -p "$(dirname "$LOG")"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

sleep 1

if [ ! -f "$PLIST" ]; then
  log "Plist not found, skipping"
  exit 0
fi

if grep -q "CLAUDE_OAUTH_TOKEN" "$PLIST"; then
  log "CLAUDE_OAUTH_TOKEN already present, no action needed"
  exit 0
fi

if [ ! -f "$SECRETS" ]; then
  log "ERROR: $SECRETS not found — cannot read CLAUDE_OAUTH_TOKEN"
  exit 1
fi

TOKEN=$(grep '^export CLAUDE_OAUTH_TOKEN=' "$SECRETS" | head -1 | cut -d= -f2-)
if [ -z "$TOKEN" ]; then
  log "ERROR: CLAUDE_OAUTH_TOKEN not found in $SECRETS"
  exit 1
fi

log "CLAUDE_OAUTH_TOKEN missing from plist — patching..."

/usr/bin/python3 << PYEOF
import re

plist_path = "$PLIST"
token = "$TOKEN"

with open(plist_path, 'r') as f:
    content = f.read()

# Fix ThrottleInterval (openclaw resets it to 1)
content = re.sub(
    r'(<key>ThrottleInterval</key>\s*<integer>)\d+(</integer>)',
    r'\g<1>30\g<2>',
    content
)

# Add CLAUDE_OAUTH_TOKEN before closing </dict> of EnvironmentVariables
if 'CLAUDE_OAUTH_TOKEN' not in content:
    content = content.replace(
        '    </dict>\n  </dict>',
        '    <key>CLAUDE_OAUTH_TOKEN</key>\n    <string>' + token + '</string>\n    </dict>\n  </dict>',
        1
    )

with open(plist_path, 'w') as f:
    f.write(content)

print("Patched: ThrottleInterval=30, CLAUDE_OAUTH_TOKEN added")
PYEOF

if [ $? -ne 0 ]; then
  log "Python patch failed"
  exit 1
fi

log "Plist patched successfully. Reloading gateway service..."

UID_VAL=$(id -u)
/bin/launchctl bootout "gui/$UID_VAL/ai.openclaw.gateway" 2>/dev/null || true
sleep 1
/bin/launchctl bootstrap "gui/$UID_VAL" "$PLIST" 2>/dev/null && log "Gateway reloaded OK" || log "Gateway bootstrap failed (may already be running)"

log "Done"
