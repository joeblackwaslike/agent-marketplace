# Host Setup Guide

One-time setup steps for your macOS host before opening the devcontainer for the first time.
These steps only need to be done once per machine.

---

## 1. Export required API keys

The container receives all secrets via `remoteEnv` — nothing is baked into the image.
Add these exports to your `~/.zshrc` or `~/.aliases.zsh` and source the file (or open a new shell):

```bash
# Anthropic / Claude
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-opus-4-5"
export ANTHROPIC_SMALL_FAST_MODEL="claude-haiku-4-5-20251001"

# OpenAI / Codex
export OPENAI_API_KEY="sk-..."
export OPENAI_ORG_ID="org-..."

# 1Password CLI (see section 2)
export OP_SERVICE_ACCOUNT_TOKEN="ops1_..."

# MCP server keys
export CONTEXT7_API_KEY="..."
export EXA_API_KEY="..."
export TAVILY_API_KEY="..."
export FIRECRAWL_API_KEY="..."
export PERPLEXITY_API_KEY="..."
export BRAVE_API_KEY="..."
export REF_API_KEY="..."
```

The container will silently pass through any variable that isn't set — tools that depend on
missing keys will fail at runtime, not at container build time.

---

## 2. 1Password CLI setup

The container uses the **1Password Service Account** authentication method. This is the right
approach when the host has no 1Password desktop app socket to mount (OrbStack containers
can't access the macOS GUI app socket).

### Create a service account token

1. Open [1Password.com](https://1password.com) → your account → **Developer Tools** → **Service Accounts**
2. Click **New Service Account**
3. Give it a name (e.g., `devcontainer`)
4. Grant access to the vaults the container needs (e.g., `cloudflare`, `porkbun`, `dev`)
5. Click **Generate Token** — copy it immediately (shown only once)

Docs: https://developer.1password.com/docs/service-accounts/

### Export the token

```bash
# In ~/.zshrc or ~/.aliases.zsh (already listed in section 1):
export OP_SERVICE_ACCOUNT_TOKEN="ops1_..."
```

### Verify inside the container

After opening the container:

```bash
op whoami
# Should print: account URL, user ID, and service account name
```

### Usage in MCP server commands

The `op` CLI is used with `op run` to inject secrets into MCP server processes:

```bash
# Example: inject secrets into a Cloudflare MCP server
op run --env-file=.env.op -- node dist/server.js
```

MCP server configurations that need 1Password secrets reference `op://vault/item/field`
directly in their environment files.

---

## 3. Install the `devcontainer-init` alias

Add this alias to your macOS `~/.zshrc` (not the container's) so you can bootstrap the
devcontainer into any project from anywhere:

```bash
alias devcontainer-init='~/github/joeblackwaslike/devcontainer/.devcontainer/scripts/init-project.sh'
```

Then run `source ~/.zshrc` or open a new terminal.

Usage:

```bash
# Bootstrap the devcontainer into a project
cd ~/github/myproject && devcontainer-init

# Or target a directory directly
devcontainer-init ~/github/anotherproject

# Preview without writing
devcontainer-init --dry-run
```

See [init-project.sh](scripts/init-project.sh) and [README.md](README.md) for full documentation.

---

## 4. Verify required host directories exist

The devcontainer mounts several directories from your home folder. Most are created by their
respective tools, but double-check before first use:

```bash
ls ~/.claude       # Claude Code config — must exist
ls ~/.claude.json  # Claude Code account — created on first claude login
ls ~/.agents       # Skills + agent definitions
ls ~/.ssh          # SSH keys
ls ~/.gitconfig    # Git identity (can be a file, not a dir)
ls ~/.config/gh    # GitHub CLI auth
ls ~/.gemini       # Gemini CLI — created on first gemini run
ls ~/.codex        # Codex CLI — created on first codex run
ls ~/.openclaw     # openclaw — created on first run
ls ~/.config/opencode
ls ~/.local/share/opencode
ls ~/.orbstack/run/docker.sock  # OrbStack Docker socket
```

Directories that don't exist will cause the container to fail to start. Create missing ones:

```bash
mkdir -p ~/.agents ~/.gemini ~/.codex ~/.openclaw ~/.config/opencode ~/.local/share/opencode
```

---

## 5. Open the container

```bash
cd ~/github/joeblackwaslike/devcontainer
code .
# VS Code: "Dev Containers: Reopen in Container"
```

The first build takes several minutes. Subsequent opens are fast (image is cached).

---

## 6. Publish the pre-built image (optional, one-time)

Building the image once and pushing it to GHCR means no project ever has to build it locally.
The `devcontainer-init` script automatically configures new projects to pull the pre-built image.

### Authenticate to GHCR

```bash
# Generate a token at https://github.com/settings/tokens
# Scopes required: write:packages, read:packages, delete:packages
echo $GITHUB_TOKEN | docker login ghcr.io -u joeblackwaslike --password-stdin
```

### Build and push

```bash
cd ~/github/joeblackwaslike/devcontainer
make push
```

This builds a multi-arch image (`linux/amd64` + `linux/arm64`) and pushes it to
`ghcr.io/joeblackwaslike/devcontainer:latest`.

### Make the package public (one-time)

After the first push, go to
`https://github.com/users/joeblackwaslike/packages/container/devcontainer/settings`
and set visibility to **Public** so projects can pull it without authentication.

### Re-publish after Dockerfile changes

```bash
make push
```

Projects pull `latest` on the next container rebuild — no changes needed in their
`devcontainer.json`.
