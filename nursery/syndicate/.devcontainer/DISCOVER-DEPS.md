# Dependency Auto-Discovery

`scripts/discover-deps.sh` runs automatically on every `postAttachCommand` (each time you
attach VS Code to the running container). It scans the workspace root for known manifest and
lock files, then installs dependencies using the appropriate tool.

---

## Detection logic

Detection runs in this exact order. Within each language, the first matching file wins.

| Signal file | Tool invoked | Notes |
|---|---|---|
| `pnpm-lock.yaml` | `pnpm install` | Respects workspace root |
| `bun.lockb` | `bun install` | |
| `yarn.lock` | `yarn install` | |
| `package-lock.json` | `npm ci` | Strict reproducible install |
| `package.json` (no lock) | `npm install` | Creates a lock file |
| `pyproject.toml` | `uv sync` | Falls back silently if uv fails |
| `requirements.txt` | `uv pip install -r` | Falls back to pip if uv unavailable |
| `Cargo.toml` | `cargo fetch` | Pre-fetches crates; does not build |
| `go.mod` | `go mod download` | Pre-fetches modules |
| `Gemfile` | `bundle install` | Only if `bundle` is in PATH |
| `.devcontainer/custom-setup.sh` | `bash .devcontainer/custom-setup.sh` | Always runs last |

---

## Per-project customization

Create `.devcontainer/custom-setup.sh` in the project repo to add anything
that the auto-detection above doesn't cover.

The `init-project.sh` CLI creates a stub for you automatically:

```bash
devcontainer-init                   # bootstraps .devcontainer/ into the current repo
devcontainer-init ~/github/myrepo   # target a specific directory
```

### Example `custom-setup.sh`

```bash
#!/usr/bin/env bash
# Install a project-specific global CLI
npm install -g @myorg/internal-cli

# Seed the local Postgres database on first attach
psql -U postgres -c "CREATE DATABASE myapp;" 2>/dev/null || true
psql -U postgres myapp < db/seed.sql 2>/dev/null || true

# Export a project-specific env var into the shell
echo 'export MY_PROJECT_MODE=devcontainer' >> ~/.zshrc
```

### Extending for a multi-service repo

If your repo has sub-packages in a monorepo layout, the auto-detection only looks at the
workspace root. Use `custom-setup.sh` to install nested deps:

```bash
#!/usr/bin/env bash
pnpm install --filter ./packages/api
pnpm install --filter ./packages/web
```

---

## Skipping discovery

Set `DISCOVER_DEPS_SKIP=1` to prevent any installation:

```json
// devcontainer.json
"remoteEnv": {
  "DISCOVER_DEPS_SKIP": "1"
}
```

Or export it inside the container at runtime:

```bash
export DISCOVER_DEPS_SKIP=1
```

---

## Troubleshooting

**Discovery ran but dependencies are missing**

Check that the lock file is at the workspace root (not in a subfolder). If you have a
non-standard layout, add the install to `custom-setup.sh`.

**`uv sync` failed silently**

The script uses `uv sync 2>/dev/null || true` so it doesn't abort a partial environment.
Run `uv sync` manually to see the full error output.

**Discovery is slow on every attach**

Package managers like `pnpm install` and `npm ci` are fast when the lock file hasn't
changed (they skip work). If your repo is large and you want to skip it, set
`DISCOVER_DEPS_SKIP=1` in `remoteEnv`.

**I want to add a new language**

Edit `scripts/discover-deps.sh` — the structure is straightforward. Then update the
detection table above and add the tool to `TOOLS.md`.
