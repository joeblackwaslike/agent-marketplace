# Sync from live OpenClaw installation

Pull the current live OpenClaw config, scripts, and LaunchAgent plists into this repo so it stays in sync with the running system.

## Steps

1. **Read current live state** — read all files listed below from the live system.

2. **Update repo scripts** — compare and update these files in the repo to match live:
   - `gateway/start-gateway.sh` ← `~/.openclaw/start-gateway.sh`
   - `gateway/refresh-secrets.sh` ← `~/.openclaw/refresh-secrets.sh`
   - `gateway/scripts/secrets-watchdog.sh` ← `~/.openclaw/scripts/secrets-watchdog.sh`
   - `gateway/scripts/patch-gateway-plist.sh` ← `~/.openclaw/scripts/patch-gateway-plist.sh`
   - `gateway/scripts/env-setup.sh` ← `~/.openclaw/scripts/env-setup.sh`

3. **Update repo plist templates** — for each `~/Library/LaunchAgents/ai.openclaw.*.plist`:
   - Read the live plist
   - Replace user-specific values with template placeholders:
     - `/Users/<username>` → `/Users/__USER__`
     - The TMPDIR value → `__TMPDIR__`
     - `OP_SERVICE_ACCOUNT_TOKEN` value → `__OP_SA_TOKEN__`
     - `OPENCLAW_GATEWAY_TOKEN` value → `__GATEWAY_TOKEN__`
     - `OPENCLAW_SERVICE_VERSION` value → `__OPENCLAW_VERSION__`
   - Write to `launchd/<plist-filename>`
   - If a live plist exists that has no repo template, create one

4. **Update openclaw.json.example** — read `~/.openclaw/openclaw.json` and produce a scrubbed version:
   - Remove `meta.lastTouchedVersion` and `meta.lastTouchedAt` values (replace with comment)
   - Replace `gateway.auth.token` with `"YOUR_GATEWAY_TOKEN_HERE"`
   - Replace any literal API keys/tokens with env-ref objects or placeholder strings
   - Keep all structural changes (new sections, renamed fields, etc.)
   - Write to `config/openclaw.json.example`

5. **Detect removals** — if a plist template or script exists in the repo but has no corresponding live file, flag it for removal and ask before deleting.

6. **Update CHANGELOG.md** — append a dated entry describing what changed, using the Keep a Changelog format documented in CLAUDE.md.

7. **Show diff summary** — display a summary of all changes made.

## Security rules

- NEVER copy literal tokens, API keys, or secrets into the repo
- Always replace secrets with template placeholders (`__OP_SA_TOKEN__`, etc.)
- If a script contains a hardcoded token, replace it with logic that reads from `.secrets.env`
- Double-check the diff before finishing — grep for patterns like `sk-ant-`, `ops_ey`, `edb46b`, or any base64-encoded JWT
