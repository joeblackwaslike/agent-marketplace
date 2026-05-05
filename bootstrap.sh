#!/usr/bin/env zsh
# bootstrap.sh — entry point for setting up idea-nursery projects on a new machine.
#
# Launches the interactive Ink CLI installer if node is available.
# Falls back to a dumb symlink-everything approach if not.
#
# Usage:
#   ./bootstrap.sh          # interactive installer (recommended)
#   ./bootstrap.sh --all    # non-interactive: install all projects silently

set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"

_green()  { printf '\033[32m✓\033[0m %s\n' "$*"; }
_yellow() { printf '\033[33m~\033[0m %s\n' "$*"; }
_red()    { printf '\033[31m✗\033[0m %s\n' "$*"; }

# ── locate node ──────────────────────────────────────────────────────────────
NODE=""
for candidate in \
  "$(command -v node 2>/dev/null)" \
  "$HOME/.nvm/versions/node/v24.14.0/bin/node" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node"
do
  [ -x "$candidate" ] && NODE="$candidate" && break
done

# ── interactive CLI (preferred) ──────────────────────────────────────────────
if [ -n "$NODE" ] && [ "${1:-}" != "--all" ]; then
  INSTALLER="$REPO/installer"
  if [ ! -d "$INSTALLER/node_modules" ]; then
    _yellow "Installing CLI dependencies..."
    (cd "$INSTALLER" && "$NODE" "$(dirname "$NODE")/npm" install --silent)
  fi
  exec "$NODE" "$INSTALLER/install.js"
fi

# ── fallback: install everything without interaction ─────────────────────────
_yellow "Node not found or --all passed — running non-interactive fallback."

# Pick a writable bin dir. /usr/local/bin is root-owned on Apple Silicon, so
# fall back to ~/bin (which Joe's dotfiles add to PATH).
BIN_DIR="/usr/local/bin"
if [ ! -w "$BIN_DIR" ]; then
  BIN_DIR="$HOME/bin"
  mkdir -p "$BIN_DIR"
  _yellow "/usr/local/bin not writable — using $BIN_DIR"
fi

safe_link() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -L "$dst" ]; then
    [ "$(readlink "$dst")" = "$src" ] && { _yellow "already linked: $dst"; return 0; }
    rm "$dst"
  elif [ -e "$dst" ]; then
    _red "SKIP: $dst is a real file — move it manually then re-run."
    return 1
  fi
  ln -s "$src" "$dst"
  _green "linked: $dst"
}

for project_dir in "$REPO/nursery"/*/; do
  name="${project_dir%/}"
  name="${name##*/}"
  printf '\n── %s\n' "$name"

  [ -d "${project_dir}bin" ] && for f in "${project_dir}bin"/*; do
    [ -f "$f" ] || continue
    chmod +x "$f"
    safe_link "$f" "$BIN_DIR/$(basename "$f")"
    # Also expose at ~/.local/bin/ — older plists hardcode that path.
    [ "$BIN_DIR" = "$HOME/.local/bin" ] || safe_link "$f" "$HOME/.local/bin/$(basename "$f")"
  done

  [ -d "${project_dir}zsh" ] && for f in "${project_dir}zsh"/*.zsh; do
    [ -f "$f" ] || continue
    fname="$(basename "$f")"
    if [ "$fname" = "docker.plugin.zsh" ]; then
      dst="$HOME/.oh-my-zsh/custom/plugins/docker/$fname"
    else
      dst="$HOME/.config/claude/$fname"
    fi
    safe_link "$f" "$dst"
  done

  [ -d "${project_dir}launchd" ] && for f in "${project_dir}launchd"/*.plist; do
    [ -f "$f" ] || continue
    dst="$HOME/Library/LaunchAgents/$(basename "$f")"
    label="$(basename "$f" .plist)"
    # Copy + substitute paths instead of symlink. Source plists hardcode
    # /Users/joeblack/, the deprecated idea-nursery repo path, and an
    # nvm-specific node bin dir — none of which are portable.
    [ -L "$dst" ] && rm "$dst"
    sed \
      -e "s|/Users/joeblack/github/joeblackwaslike/idea-nursery/projects|$REPO/nursery|g" \
      -e "s|/Users/joeblack/\\.nvm/versions/node/v[0-9.]*/bin|/opt/homebrew/bin|g" \
      -e "s|/Users/joeblack|$HOME|g" \
      "$f" > "$dst"
    chmod 644 "$dst"
    _green "rendered: $dst"
    # Make sure log dirs the plist references exist
    grep -oE "$HOME[^<]*\\.log" "$dst" 2>/dev/null | while read -r logfile; do
      mkdir -p "$(dirname "$logfile")"
    done
    launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$dst" 2>/dev/null \
      && _green "loaded: $label" \
      || _yellow "load failed: $label (may need relogin)"
  done
done

printf '\ndone.\n'
