# Plugin Marketplace Design

**Date:** 2026-04-20
**Status:** Approved

## Context

Joe Black wants a Claude Code plugin marketplace repository that:
- Hosts a registry of his personal Claude Code plugins
- Accepts community contributions (PRs) to those plugins
- Has a polished GitHub Pages site designed to build his brand in the AI/Claude community
- Is installable as a Claude Code marketplace via the standard plugin system

The two initial plugins are `lessons-learned` and `mcp-exec`, both already living in their own separate repos under `github.com/joeblackwaslike/`. This repo is a registry pointing to those repos, not a monorepo hosting the plugin code.

## Repo Structure

```
agent-marketplace/
├── .claude-plugin/
│   └── marketplace.json          # Claude Code registry manifest
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── bug_report.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── validate.yml          # PR: validate marketplace.json + plugin URLs
│       ├── deploy-pages.yml      # push to main: build + deploy GitHub Pages
│       └── lint.yml              # PR: JSON formatting check
├── docs/
│   └── index.md                  # Narrative docs / install guide
├── site/                         # Vite source for GitHub Pages
│   ├── index.html
│   ├── main.js
│   └── style.css
├── schemas/
│   └── marketplace.schema.json   # JSON Schema for CI validation
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Marketplace Manifest

`.claude-plugin/marketplace.json` follows the existing Claude Code ecosystem format, extended with `category` and `keywords` fields for the Pages site:

```json
{
  "name": "agent-marketplace",
  "metadata": {
    "description": "A curated collection of Claude Code plugins by Joe Black",
    "version": "1.0.0",
    "homepage": "https://joeblackwaslike.github.io/agent-marketplace"
  },
  "owner": {
    "name": "Joe Black",
    "github": "joeblackwaslike"
  },
  "plugins": [
    {
      "name": "lessons-learned",
      "description": "Automatic mistake capture and proactive lesson injection for AI coding agents.",
      "source": {
        "source": "url",
        "url": "https://github.com/joeblackwaslike/lessons-learned.git"
      },
      "version": "0.1.0",
      "category": "productivity",
      "keywords": ["lessons", "mistakes", "hooks", "memory"]
    },
    {
      "name": "mcp-exec",
      "description": "Sandboxed code execution MCP server — keep intermediate results out of the context window.",
      "source": {
        "source": "url",
        "url": "https://github.com/joeblackwaslike/mcp-exec.git"
      },
      "version": "0.1.0",
      "category": "execution",
      "keywords": ["mcp", "sandbox", "execution", "tools"]
    }
  ]
}
```

`category` and `keywords` are additive — the Claude Code installer ignores them; the Pages site uses them for filtering.

## GitHub Pages Site

**Technology:** Vite + vanilla JS/CSS (no framework). Built via GitHub Actions, deployed to `gh-pages` branch.

**Structure:**

### Hero Section
- Bold headline: "The Claude Code Plugin Marketplace"
- Sub-copy: "Supercharge your AI coding agent with battle-tested plugins."
- Copyable one-liner install command
- GitHub stars badge
- Designed to be screenshot-worthy for social sharing

### Plugin Catalog
- Fetches `marketplace.json` at runtime (stays current without redeploys)
- Each plugin renders as a card: name, description, category badge, keywords, version, install command snippet, link to source repo
- Category filter pills at top (All / by category)

### Footer
- GitHub repo link, contributing link, license

**Design:** Dark theme, monospace accents for code, clean sans-serif for prose. Developer-aesthetic, not startup-aesthetic.

## GitHub Actions Workflows

### `validate.yml`
- Trigger: PRs touching `.claude-plugin/marketplace.json` or `schemas/`
- Steps:
  1. Validate `marketplace.json` against `schemas/marketplace.schema.json` using `ajv-cli`
  2. For each plugin, `curl`-check that the source URL resolves to a GitHub repo containing `.claude-plugin/plugin.json` or root `plugin.json`
- Fails PR on any validation error

### `deploy-pages.yml`
- Trigger: push to `main`
- Steps:
  1. `npm ci` in `site/`
  2. `vite build` → `dist/`
  3. Deploy `dist/` to `gh-pages` branch via `actions/deploy-pages`
- Sets `VITE_MARKETPLACE_URL` pointing to raw `marketplace.json` URL

### `lint.yml`
- Trigger: PRs touching any `*.json`
- Runs `prettier --check` on JSON files
- Enforces consistent formatting

## JSON Schema

`schemas/marketplace.schema.json` validates:
- Required fields: `name`, `metadata.version`, `owner`, `plugins`
- Each plugin requires: `name`, `description`, `source.url`, `version`, `category`
- `category` is an enum of allowed values
- `keywords` is an optional array of strings

## Verification

1. `claude plugin add joeblackwaslike/agent-marketplace` — marketplace installs cleanly
2. `claude plugin install lessons-learned` and `claude plugin install mcp-exec` — both plugins install from their respective repos
3. Open PR modifying `marketplace.json` with an invalid URL — `validate.yml` fails
4. Push to `main` — GitHub Pages site deploys and shows both plugin cards with filter working
5. `prettier --check` passes on all JSON files in CI
