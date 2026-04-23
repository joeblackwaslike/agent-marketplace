# openclaw-setup

Personal OpenClaw infrastructure-as-code for macOS. Automates the full gateway + node host + secrets pipeline.

## Project context

This repo is the **canonical source of truth** for how OpenClaw is installed and configured on Joe's machines. The live installation at `~/.openclaw/` and `~/Library/LaunchAgents/ai.openclaw.*` should always match what this repo produces when `install.sh` runs.

## Key decisions

- **Homebrew only**: OpenClaw is installed via `brew install openclaw-cli`. Never via npm/pnpm global. Brew manages the node dependency, which avoids nvm/fnm path resolution issues in launchd plists (the shebang points to `/opt/homebrew/opt/node/bin/node`, the stable brew symlink).
- **No hardcoded tokens**: All secrets are read from `~/.openclaw/.secrets.env` at runtime. Scripts never contain literal API keys or tokens.
- **Pre-fetched secrets pattern**: The `op` CLI hangs in launchd context (IPC requires biometric unlock). Secrets are fetched once from 1Password and written to a chmod 600 file. See `docs/secrets-architecture.md`.
- **Loopback + Tailscale**: Both gateway and node host bind to `127.0.0.1`. External access is via Tailscale Serve only (encrypted tunnel, no open ports).
- **Template substitution**: Plist files use `__USER__`, `__TMPDIR__`, `__OP_SA_TOKEN__`, `__GATEWAY_TOKEN__`, `__OPENCLAW_VERSION__` placeholders. `install.sh` substitutes them at install time.

## File layout

```
install.sh                    Installer (idempotent, one-command)
config/openclaw.json.example  Scrubbed config template
gateway/                      Scripts copied to ~/.openclaw/
  start-gateway.sh            Gateway startup (sources .secrets.env)
  refresh-secrets.sh          1Password fetch + atomic write
  scripts/
    secrets-watchdog.sh       Reactive auth-failure refresh
    patch-gateway-plist.sh    Repairs clobbered plist after OC updates
    env-setup.sh              Sets CLAUDE_OAUTH_TOKEN in launchd global env
launchd/                      Plist templates with __PLACEHOLDER__ vars
docs/                         Architecture documentation
```

## Working with this repo

- Run `/sync-from-live` to pull the current live config/scripts/plists into the repo
- After any changes, update `CHANGELOG.md` with a dated entry describing what changed and why
- Test changes with `./install.sh` on a clean `~/.openclaw/` directory

## Changelog maintenance

**Every commit to this repo must include a CHANGELOG.md update.** The changelog uses [Keep a Changelog](https://keepachangelog.com/) format with these categories:

- **Added** — new files, services, features
- **Changed** — modifications to existing files
- **Removed** — deleted files or features
- **Fixed** — bug fixes
- **Security** — security-related changes (token handling, permissions, etc.)

Each entry should include the **what** and the **why**. Example:

```markdown
## [2026-04-09]

### Changed
- `gateway/start-gateway.sh`: Use `exec /opt/homebrew/bin/openclaw gateway` instead of
  hardcoded nvm node + dist/index.js path. Brew manages the binary and node dependency,
  making the path stable across upgrades.
```
