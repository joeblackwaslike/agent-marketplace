#!/bin/bash
# start-gateway.sh
# Sources pre-fetched secrets from .secrets.env (written by refresh-secrets.sh).
# No 1Password CLI calls at runtime — avoids IPC hang in launchd context.

set -euo pipefail

SECRETS_FILE="$HOME/.openclaw/.secrets.env"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "[start-gateway] ERROR: $SECRETS_FILE not found." >&2
  echo "[start-gateway] Run: ~/.openclaw/refresh-secrets.sh" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$SECRETS_FILE"

for var in ANTHROPIC_API_TOKEN DISCORD_BOT_TOKEN TELEGRAM_BOT_TOKEN \
           OPENCLAW_GATEWAY_TOKEN GOOGLE_API_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "[start-gateway] ERROR: $var is empty — re-run refresh-secrets.sh" >&2
    exit 1
  fi
done

echo "[start-gateway] Secrets loaded. Starting gateway..."

exec /opt/homebrew/bin/openclaw gateway --port 18789
