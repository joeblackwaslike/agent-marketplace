#!/usr/bin/env bash
# Bootstrap the shared devcontainer configuration into any project directory.
#
# INSTALL (add to ~/.zshrc or ~/.aliases.zsh on your host machine):
#   alias devcontainer-init='~/github/joeblackwaslike/devcontainer/.devcontainer/scripts/init-project.sh'
#
# USAGE:
#   devcontainer-init [target-dir] [options]
#
# OPTIONS:
#   --name NAME   Override container name (default: project directory name)
#   --force       Overwrite existing .devcontainer/ without prompting
#   --dry-run     Show what would be done without writing any files
#   --help        Show this help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVCONTAINER_SRC="$(dirname "$SCRIPT_DIR")"  # .devcontainer/ dir in this repo

TARGET_DIR=""
CONTAINER_NAME=""
FORCE=0
DRY_RUN=0

# ── Argument parsing ──────────────────────────────────────────────────────────

usage() {
    cat <<EOF
Usage: devcontainer-init [target-dir] [options]

Bootstrap the shared Claude Code devcontainer config into a project.

Arguments:
  target-dir    Project directory to initialize (default: current dir)

Options:
  --name NAME   Override the devcontainer name (default: project dir name)
  --force       Overwrite an existing .devcontainer/ directory
  --dry-run     Print what would happen without writing anything
  --help        Show this help

After running, open VS Code and choose:
  "Dev Containers: Reopen in Container"

To customize for a specific project, edit:
  <project>/.devcontainer/custom-setup.sh

See .devcontainer/DISCOVER-DEPS.md for full documentation.
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h) usage ;;
        --force)    FORCE=1;              shift ;;
        --dry-run)  DRY_RUN=1;            shift ;;
        --name)     CONTAINER_NAME="$2";  shift 2 ;;
        -*)         echo "Unknown option: $1" >&2; usage ;;
        *)          TARGET_DIR="$1";      shift ;;
    esac
done

TARGET_DIR="$(cd "${TARGET_DIR:-.}" && pwd)"
PROJECT_NAME="${CONTAINER_NAME:-$(basename "$TARGET_DIR")}"

# ── Preflight checks ──────────────────────────────────────────────────────────

if [ ! -d "$TARGET_DIR/.git" ]; then
    echo "error: $TARGET_DIR is not a git repository root" >&2
    exit 1
fi

DEST="$TARGET_DIR/.devcontainer"

if [ -d "$DEST" ] && [ "$FORCE" = "0" ]; then
    echo "error: $DEST already exists — use --force to overwrite" >&2
    exit 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo "devcontainer-init"
echo "  source  : $DEVCONTAINER_SRC"
echo "  target  : $DEST"
echo "  name    : $PROJECT_NAME"
[ "$DRY_RUN" = "1" ] && echo "  mode    : DRY RUN (no files written)"
echo ""

# ── Copy devcontainer source ──────────────────────────────────────────────────

if [ "$DRY_RUN" = "0" ]; then
    [ -d "$DEST" ] && rm -rf "$DEST"
    cp -r "$DEVCONTAINER_SRC" "$DEST"
    echo "  copied .devcontainer/"
else
    echo "  [dry] would copy $DEVCONTAINER_SRC → $DEST"
fi

# ── Update container name in devcontainer.json ───────────────────────────────

DEVCONTAINER_JSON="$DEST/devcontainer.json"
if [ -f "$DEVCONTAINER_JSON" ] && [ "$DRY_RUN" = "0" ]; then
    python3 - "$DEVCONTAINER_JSON" "$PROJECT_NAME" <<'PY'
import json, sys
path, name = sys.argv[1], sys.argv[2]
with open(path) as f:
    cfg = json.load(f)
cfg["name"] = name
# Use the pre-built image in target projects — no per-project build needed
cfg.pop("build", None)
cfg["image"] = "ghcr.io/joeblackwaslike/devcontainer:latest"
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
PY
    echo "  set devcontainer name: $PROJECT_NAME"
    echo "  set image: ghcr.io/joeblackwaslike/devcontainer:latest"
fi

# ── Create custom-setup.sh stub ───────────────────────────────────────────────

CUSTOM_SETUP="$DEST/custom-setup.sh"
if [ "$DRY_RUN" = "0" ] && [ ! -f "$CUSTOM_SETUP" ]; then
    cat > "$CUSTOM_SETUP" <<'STUB'
#!/usr/bin/env bash
# Project-specific devcontainer setup hook.
# Called by .devcontainer/scripts/discover-deps.sh on every container attach,
# after automatic dependency detection.
#
# See .devcontainer/DISCOVER-DEPS.md for documentation and examples.
#
# Examples:
#   npm install -g @myorg/internal-cli
#   psql -U postgres -c "CREATE DATABASE myapp;" 2>/dev/null || true
#   export MY_PROJECT_ENV=devcontainer
STUB
    chmod +x "$CUSTOM_SETUP"
    echo "  created custom-setup.sh stub"
fi

# ── Offer to add .devcontainer/ to .gitignore ─────────────────────────────────
# The devcontainer template is maintained centrally in this repo.
# Projects typically don't need to commit it.

GITIGNORE="$TARGET_DIR/.gitignore"
if [ "$DRY_RUN" = "0" ] && [ -f "$GITIGNORE" ] \
        && ! grep -q '^\.devcontainer' "$GITIGNORE" 2>/dev/null; then
    echo ""
    echo "  The devcontainer template is maintained centrally."
    echo "  Add .devcontainer/ to $PROJECT_NAME/.gitignore?"
    read -rp "  [y/N] " answer
    if [[ "${answer,,}" == "y" ]]; then
        echo ".devcontainer" >> "$GITIGNORE"
        echo "  added .devcontainer to .gitignore"
    fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "Done! Next steps:"
echo "  1.  cd $TARGET_DIR"
echo "  2.  code .                   (open in VS Code)"
echo "  3.  'Dev Containers: Reopen in Container'"
echo "  4.  Edit .devcontainer/custom-setup.sh for project-specific setup"
