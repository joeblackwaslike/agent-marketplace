# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [2026-04-09] — Brew migration + node host + security hardening

### Added
- `launchd/ai.openclaw.node.plist` — Node host LaunchAgent template. Runs `openclaw node run` on loopback with exec approvals (allowlist + ask=on-miss).
- `launchd/ai.openclaw.env-setup.plist` — Sets `CLAUDE_OAUTH_TOKEN` in launchd global env at login by reading from `.secrets.env`. No hardcoded tokens.
- `gateway/scripts/env-setup.sh` — Script backing the env-setup LaunchAgent. Reads token from `.secrets.env` and calls `launchctl setenv`.
- `config/openclaw.json.example` — Added `gateway.nodes.denyCommands` (camera, contacts, calendar, reminders, SMS, location, canvas.eval), `plugins`, `hooks`, `messages`, `commands`, `session`, and `models.providers.google.models` sections to match live config.
- `CLAUDE.md` — Project instructions for AI agents, changelog maintenance rules.
- `AGENTS.md` — Points to CLAUDE.md.
- `CHANGELOG.md` — This file.
- `.agents/commands/sync-from-live.md` — Cross-agent command to sync live config into the repo.
- `.claude` → `.agents` symlink (Claude Code command discovery).
- `.gemini` → `.agents` symlink (Gemini CLI command discovery).

### Changed
- `install.sh` — Complete rewrite for brew-based workflow:
  - Prerequsites now check for `brew install openclaw-cli` instead of npm global.
  - Auto-installs openclaw via Homebrew if missing.
  - Installs all 6 LaunchAgents (was 4): added node host + env-setup.
  - Resolves gateway token from `.secrets.env` or generates new one.
  - Substitutes `__OPENCLAW_VERSION__` and `__GATEWAY_TOKEN__` template vars.
  - Removed all nvm/npm path patching logic (no longer needed with brew).
- `gateway/start-gateway.sh` — `exec` line changed from `node /path/to/dist/index.js gateway` to `exec /opt/homebrew/bin/openclaw gateway --port 18789`. Brew-managed binary is stable across upgrades.
- `gateway/scripts/patch-gateway-plist.sh` — **Security fix**: Removed hardcoded Anthropic OAuth token. Now reads `CLAUDE_OAUTH_TOKEN` from `~/.openclaw/.secrets.env` at runtime.
- `launchd/ai.openclaw.gateway.plist` — Cleaned PATH: removed nvm, volta, asdf, fnm, bun, npm-global entries. Added `OPENCLAW_SERVICE_VERSION`, `OPENCLAW_SYSTEMD_UNIT`, `OPENCLAW_WINDOWS_TASK_NAME` template vars to match live config.
- `config/openclaw.json.example` — `gateway.auth.token` changed from secret-ref object to literal string placeholder (OpenClaw validates it as string, not object). `channels.telegram.streaming` changed from string `"partial"` to object `{"mode": "partial"}`.
- `docs/secrets-architecture.md` — Added env-setup.sh documentation, node host security section, corrected Anthropic field label to `me@joeblack.nyc oauth token`.
- `README.md` — Full rewrite: added architecture diagram, security model section, node host documentation, brew upgrade instructions, complete service table.

### Removed
- nvm/npm path resolution logic from `install.sh` — no longer needed since brew manages the node binary.
- Hardcoded `__NODE__` and `__OPENCLAW__` template vars from gateway plist — replaced by brew-managed single binary at `/opt/homebrew/bin/openclaw`.

### Security
- Removed hardcoded Anthropic OAuth token from `patch-gateway-plist.sh` (was `sk-ant-oat01-...`).
- env-setup plist now uses a script that reads from `.secrets.env` instead of passing the literal token as a program argument (visible in `ps` output).
- Gateway and node host PATH entries cleaned to remove version-manager directories that could be manipulated.

## [2026-04-06] — Initial release

### Added
- `install.sh` — One-command installer with 1Password integration.
- `gateway/start-gateway.sh` — Gateway startup script with pre-fetched secrets.
- `gateway/refresh-secrets.sh` — 1Password secret fetcher with atomic write and JWT expiry checks.
- `gateway/scripts/secrets-watchdog.sh` — Reactive auth-failure secret refresh.
- `gateway/scripts/patch-gateway-plist.sh` — Plist repair after openclaw updates.
- `launchd/ai.openclaw.gateway.plist` — Gateway LaunchAgent template.
- `launchd/ai.openclaw.secrets-refresh.plist` — Daily secret refresh LaunchAgent.
- `launchd/ai.openclaw.secrets-watchdog.plist` — Auth-failure watchdog LaunchAgent.
- `launchd/ai.openclaw.gateway-patcher.plist` — Plist repair watchdog LaunchAgent.
- `config/openclaw.json.example` — Scrubbed config template.
- `docs/secrets-architecture.md` — Architecture documentation for the secrets pipeline.
- `README.md` — Project documentation.
