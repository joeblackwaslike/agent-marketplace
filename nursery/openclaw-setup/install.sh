#!/bin/bash
# install.sh — One-command OpenClaw setup for macOS
#
# Usage:
#   ./install.sh
#   OP_SA_TOKEN=ops_... ./install.sh   # non-interactive

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER=$(whoami)
HOME_DIR="/Users/$USER"
OPENCLAW_DIR="$HOME_DIR/.openclaw"
LAUNCH_AGENTS="$HOME_DIR/Library/LaunchAgents"
TMPDIR_VAL=$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null || echo "/tmp/")

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[install]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
error()   { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

check_prereqs() {
  info "Checking prerequisites..."
  local missing=()
  for cmd in op jq tailscale; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  [ ${#missing[@]} -eq 0 ] || error "Missing: ${missing[*]}. Install via Homebrew: brew install ${missing[*]}"

  if ! command -v openclaw &>/dev/null; then
    info "openclaw not found — installing via Homebrew..."
    brew install openclaw-cli || error "Failed to install openclaw-cli"
  fi

  OPENCLAW_VERSION=$(openclaw --version 2>/dev/null | awk '{print $2}')
  info "Prerequisites OK (openclaw $OPENCLAW_VERSION)"
}

get_op_token() {
  if [ -n "${OP_SA_TOKEN:-}" ]; then
    OP_SERVICE_ACCOUNT_TOKEN="$OP_SA_TOKEN"
  elif [ -f "$OPENCLAW_DIR/op-service-account.env" ]; then
    OP_SERVICE_ACCOUNT_TOKEN=$(cut -d= -f2- "$OPENCLAW_DIR/op-service-account.env")
    info "Using existing service account token from op-service-account.env"
  else
    echo -n "Enter your 1Password service account token (ops_...): "
    read -rs OP_SERVICE_ACCOUNT_TOKEN
    echo
  fi

  export OP_SERVICE_ACCOUNT_TOKEN OP_BIOMETRIC_UNLOCK_ENABLED=false
  /opt/homebrew/bin/op whoami &>/dev/null || error "Service account token invalid or can't reach 1Password"
  info "1Password service account authenticated"

  mkdir -p "$OPENCLAW_DIR"
  printf 'OP_SERVICE_ACCOUNT_TOKEN=%s\n' "$OP_SERVICE_ACCOUNT_TOKEN" > "$OPENCLAW_DIR/op-service-account.env"
  chmod 600 "$OPENCLAW_DIR/op-service-account.env"
}

create_dirs() {
  info "Creating ~/.openclaw directory structure..."
  mkdir -p \
    "$OPENCLAW_DIR/logs" \
    "$OPENCLAW_DIR/scripts" \
    "$OPENCLAW_DIR/workspace" \
    "$OPENCLAW_DIR/workspace-mac"
}

install_scripts() {
  info "Installing scripts..."
  cp "$REPO_DIR/gateway/start-gateway.sh"                "$OPENCLAW_DIR/start-gateway.sh"
  cp "$REPO_DIR/gateway/refresh-secrets.sh"              "$OPENCLAW_DIR/refresh-secrets.sh"
  cp "$REPO_DIR/gateway/scripts/secrets-watchdog.sh"     "$OPENCLAW_DIR/scripts/secrets-watchdog.sh"
  cp "$REPO_DIR/gateway/scripts/patch-gateway-plist.sh"  "$OPENCLAW_DIR/scripts/patch-gateway-plist.sh"
  cp "$REPO_DIR/gateway/scripts/env-setup.sh"            "$OPENCLAW_DIR/scripts/env-setup.sh"
  chmod +x \
    "$OPENCLAW_DIR/start-gateway.sh" \
    "$OPENCLAW_DIR/refresh-secrets.sh" \
    "$OPENCLAW_DIR/scripts/secrets-watchdog.sh" \
    "$OPENCLAW_DIR/scripts/patch-gateway-plist.sh" \
    "$OPENCLAW_DIR/scripts/env-setup.sh"
  info "Scripts installed"
}

get_gateway_token() {
  if [ -f "$OPENCLAW_DIR/.secrets.env" ]; then
    GATEWAY_TOKEN=$(grep '^export OPENCLAW_GATEWAY_TOKEN=' "$OPENCLAW_DIR/.secrets.env" | head -1 | cut -d= -f2-)
  fi
  if [ -z "${GATEWAY_TOKEN:-}" ]; then
    GATEWAY_TOKEN=$(openssl rand -hex 24)
    warn "Generated new gateway token: $GATEWAY_TOKEN"
    warn "Store this in your 1Password OpenClawCredentials item"
  fi
}

install_launchd() {
  info "Installing LaunchAgents..."
  local plists=(
    "ai.openclaw.gateway.plist"
    "ai.openclaw.node.plist"
    "ai.openclaw.env-setup.plist"
    "ai.openclaw.secrets-refresh.plist"
    "ai.openclaw.secrets-watchdog.plist"
    "ai.openclaw.gateway-patcher.plist"
  )

  for plist in "${plists[@]}"; do
    local src="$REPO_DIR/launchd/$plist"
    local dst="$LAUNCH_AGENTS/$plist"

    sed \
      -e "s|__USER__|$USER|g" \
      -e "s|__TMPDIR__|$TMPDIR_VAL|g" \
      -e "s|__OP_SA_TOKEN__|$OP_SERVICE_ACCOUNT_TOKEN|g" \
      -e "s|__GATEWAY_TOKEN__|$GATEWAY_TOKEN|g" \
      -e "s|__OPENCLAW_VERSION__|$OPENCLAW_VERSION|g" \
      "$src" > "$dst"

    chmod 644 "$dst"

    launchctl bootout "gui/$(id -u)" "$dst" 2>/dev/null || true
    sleep 0.3
    launchctl bootstrap "gui/$(id -u)" "$dst"
    info "  + $plist"
  done
}

install_config() {
  if [ ! -f "$OPENCLAW_DIR/openclaw.json" ]; then
    info "No openclaw.json found — copying example config..."
    # Substitute the gateway token into the example config
    sed "s|YOUR_GATEWAY_TOKEN_HERE|$GATEWAY_TOKEN|g" \
      "$REPO_DIR/config/openclaw.json.example" > "$OPENCLAW_DIR/openclaw.json"
    warn "Edit $OPENCLAW_DIR/openclaw.json to set your auth profiles, channels, etc."
  else
    info "openclaw.json already exists — skipping (not overwriting)"
  fi
}

fetch_secrets() {
  info "Fetching secrets from 1Password..."
  export OP_SERVICE_ACCOUNT_TOKEN OP_BIOMETRIC_UNLOCK_ENABLED=false
  bash "$OPENCLAW_DIR/refresh-secrets.sh"
}

main() {
  echo ""
  echo "  OpenClaw Setup Installer"
  echo "  ========================"
  echo ""

  check_prereqs
  get_op_token
  create_dirs
  install_scripts
  get_gateway_token
  install_config
  fetch_secrets
  install_launchd

  echo ""
  info "Install complete!"
  echo ""
  echo "  Services:"
  echo "    Gateway:  launchctl list ai.openclaw.gateway"
  echo "    Node:     launchctl list ai.openclaw.node"
  echo ""
  echo "  Logs:"
  echo "    tail -f ~/.openclaw/logs/gateway.log"
  echo "    tail -f ~/.openclaw/logs/node.log"
  echo ""
  echo "  Refresh secrets:"
  echo "    ~/.openclaw/refresh-secrets.sh"
  echo ""
}

main "$@"
