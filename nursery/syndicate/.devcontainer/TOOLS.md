# Installed Tools Catalog

Comprehensive reference for everything installed in this devcontainer image.
Each section lists the install method, version strategy, and purpose.
Update this file whenever you add, remove, or upgrade a tool.

---

## System packages (apt / Aptfile)

Installed at image build time via `seatgeek/bash-aptfile` running against `Aptfile`.

| Package | Purpose |
|---|---|
| autoconf, automake, cmake, ninja-build, make | Build tooling |
| build-essential, gcc, llvm | C/C++ compiler toolchain |
| libssl-dev, libffi-dev, libreadline-dev, libsqlite3-dev, + ~30 more libs | Dev headers for language runtimes |
| bat | `cat` with syntax highlighting |
| curl, wget, httpie | HTTP clients |
| fzf | Fuzzy finder |
| git, git-lfs | Version control |
| gnupg, gpg | Cryptography |
| graphviz, imagemagick, tesseract-ocr, ghostscript | Graphics / OCR |
| jq, yq | JSON/YAML processors (system fallback; asdf versions take precedence) |
| neovim, vim, tmux | Terminal editors / multiplexer |
| pgcli, pgloader | PostgreSQL clients |
| pipx | Python CLI tool installer (system fallback; asdf version used at runtime) |
| redis-server | In-container Redis |
| ripgrep | Fast grep |
| shellcheck, shfmt | Shell script linting / formatting |
| sqlite3, libsqlite3-dev | SQLite |
| procps, tree, lsof, rsync, unzip | General utilities |
| zsh, locales | Shell + locale |

---

## PostgreSQL 18 (PGDG apt repo)

Added via the [official PGDG apt repository](https://www.postgresql.org/download/linux/ubuntu/).

| Package | Version | Notes |
|---|---|---|
| postgresql-18 | latest 18.x | Server |
| postgresql-client-18 | latest 18.x | `psql` client |
| libpq-dev | latest 18.x | C headers for psql bindings |

To upgrade: update the PGDG source list in the Dockerfile and rebuild.

---

## 1Password CLI

Installed via the [official 1Password apt repo](https://developer.1password.com/docs/cli/get-started/).

| Tool | Command | Purpose |
|---|---|---|
| 1Password CLI | `op` | `op run` wraps MCP server commands with secrets from 1Password vaults (cloudflare, porkbun MCP servers) |

---

## Language runtimes (asdf)

All managed by [asdf](https://asdf-vm.com/) v0.18.1. `ASDF_DATA_DIR=/home/vscode/.asdf`.
Version specs use `latest:N` to pin major while tracking minor/patch updates.

| Plugin | Version spec | Command(s) | Notes |
|---|---|---|---|
| python | `latest:3` | `python3`, `pip3` | Primary Python runtime |
| nodejs | `lts` | `node`, `npm` | LTS line |
| ruby | `latest:4` | `ruby`, `gem` | Ruby 4.x |
| golang | `latest:1` | `go` | Go 1.x |
| rust | `stable` | `cargo`, `rustc`, `rustup` | Stable toolchain |
| bun | `latest:1` | `bun`, `bunx` | JS runtime / bundler |
| pnpm | `latest:10` | `pnpm`, `pnpx` | pnpm 10.x |
| deno | `latest` | `deno` | Deno runtime |
| awscli | `latest:2` | `aws` | AWS CLI v2 |
| gcloud | `latest` | `gcloud`, `gsutil` | Google Cloud SDK |
| pipx | `latest:1` | `pipx` | Python CLI tool isolation |
| supabase-cli | `latest` | `supabase` | Supabase management CLI |
| yarn | `latest` | `yarn` | Yarn package manager |
| jq | `latest` | `jq` | JSON processor (asdf version shadows apt) |
| yq | `latest` | `yq` | YAML/JSON processor |
| just | `latest` | `just` | Command runner (Justfile) |

To add a new asdf plugin: `asdf plugin add <name> && asdf install <name> latest && asdf set -u <name> latest`

---

## Package managers

| Tool | Install method | Purpose |
|---|---|---|
| uv | `curl -LsSf https://astral.sh/uv/install.sh` → `/usr/local/bin` | Fast Python package/project manager |
| pipx | asdf (listed above) | Isolated Python CLI tool environments |
| pnpm | asdf (listed above) | Node package manager |
| yarn | asdf (listed above) | Node package manager |
| volta | `curl https://get.volta.sh` → `/usr/local/share/volta` | Supplemental JS toolchain for volta-pinned repos |

---

## CLI tools — Rust / cargo

Installed with `CARGO_INSTALL_ROOT=/usr/local` → binaries land in `/usr/local/bin/`.

| Crate | Command | Purpose |
|---|---|---|
| diskus | `diskus` | Fast `du` replacement |
| du-dust | `dust` | Directory size visualiser |
| eza | `eza` | Modern `ls` replacement |
| hyperfine | `hyperfine` | CLI benchmarking tool |
| procs | `procs` | Modern `ps` replacement |
| sad | `sad` | CLI search-and-replace (stream ed) |
| git-delta | `delta` | Syntax-highlighted git diffs |

To add a cargo tool: add to the `cargo install` block in the Dockerfile and add a row here.

---

## CLI tools — Go

Installed with `GOPATH=/usr/local` → binaries land in `/usr/local/bin/`.

| Module | Command | Purpose |
|---|---|---|
| `github.com/steveyegge/beads/cmd/bd` | `bd` | Beads task manager (Claude Code plugin) |
| `golang.org/x/tools/cmd/stringer` | `stringer` | Go generate string methods for types |
| `github.com/gastownhall/gastown/cmd/gt` | `gt` | Multi-agent workspace manager |
| `github.com/walles/moor/v2/cmd/moor` | `moor` | Terminal pager (used as PAGER / MANPAGER) |

---

## CLI tools — npm globals

Installed with `npm install -g` into the asdf-managed Node installation.
After install, `asdf reshim nodejs` regenerates shims in `$ASDF_DATA_DIR/shims/`.

| Package | Command | Purpose |
|---|---|---|
| `@anthropic-ai/claude-code` | `claude` | Claude Code CLI |
| `@devcontainers/cli` | `devcontainer` | Dev Containers CLI |
| `@google/gemini-cli` | `gemini` | Google Gemini CLI |
| `tsx` | `tsx` | TypeScript execute (ts-node alternative) |

---

## CLI tools — binary releases (GitHub)

Architecture-aware: ARM64 or amd64 selected at build time via `uname -m`.

| Tool | GitHub repo | Command | Purpose |
|---|---|---|---|
| dolt | `dolthub/dolt` | `dolt` | Git for data — versioned SQL database |
| glow | `charmbracelet/glow` | `glow` | Markdown renderer for the terminal |
| mkcert | `FiloSottile/mkcert` | `mkcert` | Local CA and TLS certificate generator |
| step | `smallstep/cli` | `step` | Smallstep certificate + PKI CLI |

All binaries installed to `/usr/local/bin/`.
To upgrade, bump the `latest` release logic in the Dockerfile or pin a tag.

---

## Python tools (pipx)

Installed with `PIPX_HOME=/usr/local/pipx` and `PIPX_BIN_DIR=/usr/local/bin`.
Executables land directly in `/usr/local/bin/`.

| Package | Commands | Purpose |
|---|---|---|
| sqlfluff | `sqlfluff` | SQL linter and formatter |
| csvkit | `csvcut`, `csvjoin`, `csvstat`, `in2csv`, `sql2csv`, + more | CSV Swiss army knife |

---

## oh-my-posh

Installed via `curl -s https://ohmyposh.dev/install.sh` to `/usr/local/bin/oh-my-posh`.
Theme configured in `.devcontainer/.mytheme.omp.yaml` (copied into the container image).

---

## AI / agent tools summary

| Tool | Source | Notes |
|---|---|---|
| claude (Claude Code) | npm: `@anthropic-ai/claude-code` | Alias `claude='claude --dangerously-skip-permissions'` set in .zshrc |
| gemini-cli | npm: `@google/gemini-cli` | Google Gemini terminal agent |
| beads (`bd`) | Go: `github.com/steveyegge/beads` | Task management for Claude Code |
| gastown (`gt`) | Go: `github.com/gastownhall/gastown` | Multi-agent workspace orchestration; depends on dolt |
| opencode | **not yet installed** | Binary not on npm; TODO: add GitHub release download when stable |

---

## Devcontainer features

| Feature | Purpose |
|---|---|
| `ghcr.io/devcontainers/features/docker-in-docker:2` | Docker daemon inside the container (non-root enabled) |
| `ghcr.io/devcontainers/features/node:1` | Configures npm global prefix for non-root user |

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-21 | Initial comprehensive install: PostgreSQL 18, 1Password CLI, deno, just, eza, diskus, du-dust, hyperfine, procs, sad, git-delta, beads, stringer, gastown, moor, oh-my-posh, uv, volta, dolt, glow, mkcert, step, sqlfluff, csvkit, @anthropic-ai/claude-code, @devcontainers/cli, @google/gemini-cli, tsx |
| 2026-05-21 | Bug fix: asdf `ASDF_DATA_DIR=/home/vscode/.asdf` so runtime user can access shims |
| 2026-05-21 | Bug fix: removed ghost Homebrew init from .zshrc |
| 2026-05-21 | Added macOS path alias `/Users/joe → /home/vscode` for settings.json MCP path compat |
| 2026-05-21 | Added mounts: ~/.agents, ~/.gitconfig, ~/.config/gh, ~/github/joeblackwaslike |
| 2026-05-21 | Added remoteEnv passthrough for all API keys |
| 2026-05-21 | Added discover-deps.sh auto-dependency install on attach |
| 2026-05-21 | Added init-project.sh CLI for bootstrapping new projects |
| 2026-05-21 | Added mounts: ~/.gemini (Gemini CLI), ~/.codex (Codex/openclaw), ~/.openclaw (openclaw workspace) |
| 2026-05-21 | Added OP_SERVICE_ACCOUNT_TOKEN to remoteEnv (1Password CLI — no socket on this host) |
