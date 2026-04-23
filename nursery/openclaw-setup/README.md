# openclaw-setup

Personal OpenClaw gateway + node host setup for macOS — config, scripts, LaunchAgents, and one-command installer.

Goal: one-command deploy of the full OpenClaw environment on any new Mac.

## Architecture

```
                        ┌──────────────────────┐
                        │   1Password Vault    │
                        │   (OpenClaw vault)   │
                        └──────────┬───────────┘
                                   │  op item get
                                   ▼
                        ┌──────────────────────┐
  Daily 9am / on error  │  refresh-secrets.sh  │  Manual trigger
  ────────────────────► │  (atomic write)      │ ◄────────────
                        └──────────┬───────────┘
                                   │  chmod 600
                                   ▼
                        ┌──────────────────────┐
                        │   .secrets.env       │
                        └─────┬──────────┬─────┘
                              │          │
                    source    │          │  grep + launchctl setenv
                              ▼          ▼
               ┌──────────────────┐  ┌──────────────────┐
               │  Gateway         │  │  env-setup.sh    │
               │  (port 18789)    │  │  (global env)    │
               │  loopback only   │  └──────────────────┘
               └────────┬─────────┘
                        │  Tailscale Serve
                        ▼
               ┌──────────────────┐
               │  Node Host       │
               │  (127.0.0.1)     │
               │  exec approvals  │
               └──────────────────┘
```

## What's here

```
install.sh                          One-command installer

gateway/                            Runtime scripts (copied to ~/.openclaw/)
  start-gateway.sh                  Sources secrets, execs openclaw gateway
  refresh-secrets.sh                Fetches secrets from 1Password; restarts gateway
  scripts/
    secrets-watchdog.sh             Triggered by WatchPaths on auth failure
    patch-gateway-plist.sh          Re-patches gateway plist if openclaw update clobbers it
    env-setup.sh                    Sets CLAUDE_OAUTH_TOKEN in launchd global env

launchd/                            LaunchAgents (installed to ~/Library/LaunchAgents/)
  ai.openclaw.gateway.plist         Gateway process (KeepAlive, loopback)
  ai.openclaw.node.plist            Node host process (KeepAlive, loopback)
  ai.openclaw.env-setup.plist       Sets CLAUDE_OAUTH_TOKEN globally at login
  ai.openclaw.secrets-refresh.plist Daily 9am secret refresh
  ai.openclaw.secrets-watchdog.plist Reactive refresh on auth failure
  ai.openclaw.gateway-patcher.plist Repairs plist after openclaw updates

config/
  openclaw.json.example             Scrubbed config template

docs/
  secrets-architecture.md           How the 1Password + launchd secrets flow works
```

## Quick install

```bash
git clone https://github.com/joeblackwaslike/openclaw-setup ~/github/joeblackwaslike/openclaw-setup
cd ~/github/joeblackwaslike/openclaw-setup
./install.sh
```

## Prerequisites

- macOS (tested on M2/M3, macOS 26+)
- [Homebrew](https://brew.sh/)
- [1Password CLI](https://developer.1password.com/docs/cli/) (`brew install 1password-cli`)
- A 1Password service account token with read access to your `OpenClaw` vault
- `jq` (`brew install jq`)
- `tailscale` (`brew install tailscale`)

OpenClaw itself is installed automatically via `brew install openclaw-cli` if not already present. **Do not install openclaw via npm** — brew manages the node dependency and avoids nvm/fnm path resolution issues in launchd.

## First-time secret setup

1. Create an `OpenClaw` vault in 1Password with an item named `OpenClawCredentials`
2. Add sections + fields as described in [`docs/secrets-architecture.md`](docs/secrets-architecture.md)
3. Create a service account token and export it:
   ```bash
   export OP_SERVICE_ACCOUNT_TOKEN=ops_...
   ```
4. Run the installer:
   ```bash
   ./install.sh
   ```

## Services

| Service | Label | Description |
|---|---|---|
| Gateway | `ai.openclaw.gateway` | Main orchestration hub (KeepAlive, loopback-bound) |
| Node Host | `ai.openclaw.node` | Local machine execution (KeepAlive, loopback-bound) |
| Env Setup | `ai.openclaw.env-setup` | Sets CLAUDE_OAUTH_TOKEN in launchd global env at login |
| Secrets Refresh | `ai.openclaw.secrets-refresh` | Daily 9am 1Password fetch |
| Secrets Watchdog | `ai.openclaw.secrets-watchdog` | Reactive refresh on auth failure |
| Gateway Patcher | `ai.openclaw.gateway-patcher` | Repairs plist after openclaw self-updates |

## Security model

- **Gateway**: Bound to `127.0.0.1:18789` (loopback only). Exposed to tailnet via Tailscale Serve (encrypted tunnel, no open ports).
- **Node Host**: Connects to gateway on loopback. Exec approvals use `allowlist` security with `ask=on-miss` (default-deny for `system.run`).
- **denyCommands**: Camera, contacts, calendar, reminders, SMS, location, and canvas.eval are blocked at the gateway level.
- **Secrets**: Pre-fetched from 1Password to `~/.openclaw/.secrets.env` (chmod 600). No `op` CLI calls in launchd context (avoids IPC hang). See [`docs/secrets-architecture.md`](docs/secrets-architecture.md).
- **Tokens**: Never hardcoded in scripts. Read from `.secrets.env` at runtime.

## Updating secrets manually

```bash
~/.openclaw/refresh-secrets.sh
# gateway auto-restarts at the end
```

## Upgrading openclaw

```bash
brew upgrade openclaw-cli
# Services pick up the new binary automatically (KeepAlive restarts)
# If gateway plist gets clobbered, the gateway-patcher agent auto-repairs it
```

## Secrets refresh schedule

| Trigger | Mechanism |
|---|---|
| Daily 9am | `ai.openclaw.secrets-refresh` LaunchAgent |
| Auth failure in gateway log | `ai.openclaw.secrets-watchdog` WatchPaths |
| Manual | `~/.openclaw/refresh-secrets.sh` |
