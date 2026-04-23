# Secrets Architecture

## The problem

OpenClaw's gateway needs API keys at startup. The naive approach — storing them in `openclaw.json` or passing them directly in the LaunchAgent plist — has several failure modes:

- openclaw updates **clobber the plist**, wiping injected env vars
- The `op` CLI **hangs in launchd context** when the 1Password app is running (IPC requires biometric unlock, which launchd can't do)
- `ThrottleInterval: 1` + a crashing gateway = the `op` binary gets called hundreds of times/min, triggering macOS Automation permission dialogs every 2 seconds

## The solution: pre-fetched secrets file

```
Terminal (biometrics work)          launchd context (no biometrics)
         │                                    │
         ▼                                    ▼
  refresh-secrets.sh          start-gateway.sh
  op item get → 1Password      source ~/.openclaw/.secrets.env
         │                                    │
         ▼                                    ▼
  ~/.openclaw/.secrets.env     exec openclaw gateway
  (chmod 600, atomic write)

                              env-setup.sh
                              grep CLAUDE_OAUTH_TOKEN from .secrets.env
                                    │
                                    ▼
                              launchctl setenv (global env)
```

`refresh-secrets.sh` runs `op item get` once — from a context where 1Password's IPC works — and writes all secrets to a `chmod 600` file. The gateway script sources that file at startup with zero `op` calls.

`env-setup.sh` reads the Anthropic token from `.secrets.env` and sets it in the launchd global environment so other programs (like Claude Code) can access it without sourcing the file.

## 1Password vault structure

Vault: `OpenClaw`
Item: `OpenClawCredentials` (type: API Credential)

| Section | Field label | Maps to env var |
|---|---|---|
| Anthropic | `me@joeblack.nyc oauth token` | `CLAUDE_OAUTH_TOKEN`, `ANTHROPIC_API_TOKEN` |
| Discord Bot | `bot token` | `DISCORD_BOT_TOKEN` |
| Telegram Bot | `password` | `TELEGRAM_BOT_TOKEN` |
| OpenClaw | `gateway auth token` | `OPENCLAW_GATEWAY_TOKEN` |
| SAG | `api key` | `SAG_API_KEY` |
| Google Places | `api key` | `GOPLACES_API_KEY` |
| Google API | `api key` | `GOOGLE_API_KEY` |
| z.ai | `api key` | `ZAI_API_KEY` |
| Codex | `oauth token` | `OPENAI_OAUTH_TOKEN` |

## Service account token

The `OP_SERVICE_ACCOUNT_TOKEN` in the LaunchAgent plists is a 1Password service account with **read-only** access to the `OpenClaw` vault. It's used by the daily refresh and watchdog agents — not by the gateway itself.

Create one at: https://my.1password.com/developer-tools/service-accounts

## Token expiry notes

| Token | Type | TTL | Renewal |
|---|---|---|---|
| Anthropic OAuth | Opaque | ~1 year | Re-auth at claude.ai |
| Codex/OpenAI JWT | JWT (exp claim) | 10 days | Re-auth at claude.ai/codex |
| Gateway token | Random hex | Manual | Generate with `openssl rand -hex 24` |
| 1Password SA token | Opaque | Set by you | Service account settings |

`refresh-secrets.sh` parses the Codex JWT `exp` claim and logs a warning when ≤ 2 days remain.

## Auto-refresh schedule

| Agent | Trigger | Action |
|---|---|---|
| `ai.openclaw.secrets-refresh` | Daily 9am (`StartCalendarInterval`) | Full refresh + gateway restart |
| `ai.openclaw.secrets-watchdog` | Write to `gateway.err.log` (`WatchPaths`) | Checks for auth failure patterns; refreshes if found |
| `ai.openclaw.env-setup` | Login (`RunAtLoad`) | Sets `CLAUDE_OAUTH_TOKEN` in launchd global env |

## Why `OP_BIOMETRIC_UNLOCK_ENABLED=false`

Without this, the `op` CLI routes all requests through the 1Password app's IPC socket when the app is running. From launchd, that IPC connection hangs indefinitely waiting for a biometric confirmation that never comes. Setting `OP_BIOMETRIC_UNLOCK_ENABLED=false` forces the CLI to use the service account token directly via API.

## Node host security

The node host (`ai.openclaw.node`) runs on loopback (`127.0.0.1:18789`) and connects to the gateway. It uses exec approvals with:

- **Security model**: `allowlist` — only explicitly allowed commands can run
- **Ask mode**: `on-miss` — commands not in the allowlist require explicit approval
- **denyCommands**: Camera, contacts, calendar, reminders, SMS, location, and canvas.eval are blocked at the gateway level regardless of exec approvals

The exec approvals config lives at `~/.openclaw/exec-approvals.json`.
