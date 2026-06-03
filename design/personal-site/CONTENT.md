# Personal Site — Content & Structure Spec

Single-page personal hub for Joe Black (joeblack.nyc). Structure and copy only — visual design is specified separately in DESIGN.md.

---

## Site identity

- Site name / wordmark: "joeblack.nyc" (`.nyc` visually distinguished)
- Light/dark mode toggle (defaults to dark)

---

## Navigation

Sticky top nav bar:
- Wordmark left: `joeblack<span class="nyc">.nyc</span>`
- Nav links: Plugins, Writing, Projects, Connect
- Icon links: GitHub (`@joeblackwaslike`), Twitter/X (`@joeblackwaslike`)
- Light/dark mode toggle button

---

## Section 1 — Hero

- Status chip: pulsing "online" dot + "NYC · Building for the agentic era"
- Large heading (two lines): "Joe" / "Black." — second word visually emphasized with accent color
- Subheading: "I build tools, plugins, and systems at the frontier of AI agents. Currently obsessed with making Claude Code smarter."
- Two CTA buttons: "Explore Plugins" (primary) and "Get in Touch" (secondary/ghost)

---

## Section 2 — Plugins (id: plugins)

Section label: "AI Agent Plugins"
Section heading: "Built for the agentic stack."
Section description: "Battle-tested plugins for Claude Code and Codex CLI. Install the marketplace in one command."

### Platform switcher

Two tabs: **Claude Code** | **Codex CLI**

Each tab shows:
- A copyable one-line install command for the marketplace
- Category filter pills: "All" + dynamic categories from plugin data
- Plugin card grid (loaded from JSON feed)

**Claude Code install command:**
```
claude plugin marketplace add joeblackwaslike/agent-marketplace
```

**Codex CLI install command:**
```
codex plugin marketplace add joeblackwaslike/agent-marketplace
```

### Plugin card fields

Each card contains:
- Category badge (top-left)
- Plugin name
- Description
- Keyword tags
- Per-platform install command with copy button: `claude plugin install <name>` / `codex plugin install <name>`
- Version number
- "Source →" link to GitHub

### Claude Code plugins (8)

1. **lessons-learned** — Category: productivity
   Description: Automatic mistake capture and proactive lesson injection for AI coding agents. Mines conversation logs for mistake patterns, structures them as indexed lessons, and injects relevant warnings before the agent repeats the mistake.
   Keywords: lessons, mistakes, hooks, memory, injection
   Source: github.com/joeblackwaslike/lessons-learned

2. **mcp-exec** — Category: execution
   Description: Sandboxed code execution MCP server — keep intermediate results out of the context window.
   Keywords: mcp, sandbox, execution, tools
   Source: github.com/joeblackwaslike/mcp-exec

3. **gstack** — Category: productivity
   Description: Garry Tan's gstack AI workflow skills, packaged as a Claude Code plugin with gstack: namespace. 47 skills including ship, review, qa, browse, investigate, office-hours, and more. Fork of garrytan/gstack.
   Keywords: gstack, workflow, skills, ship, review, qa, browse, garrytan
   Source: github.com/joeblackwaslike/gstack

4. **agent-skills** — Category: productivity
   Description: Joe Black's custom skills for Claude Code — agentic development, multi-provider plugin architecture, Claude Code plugin development, and best practices for working with Claude Code.
   Keywords: skills, agent-development, plugin-development, agentic, multi-provider, claude-code
   Source: github.com/joeblackwaslike/agent-skills

5. **anti-compact** — Category: productivity
   Description: Intercepts /compact and generates a structured session handoff instead of lossy compaction. Preserves critical decision context that would otherwise be lost during Claude Code's automatic context compaction.
   Keywords: context, handoff, compaction, memory, session, hooks
   Source: github.com/joeblackwaslike/anti-compact

6. **memtree** — Category: memory
   Description: Persistent graph store for codebase and web navigation. Intercepts Read/Grep/Bash/WebFetch and redirects to memtree MCP tools that symbol-chunk files, store nodes in a SQLite graph, and return compact references. Enables recall across sessions without re-reading files.
   Keywords: memory, context, mcp, recall, sqlite, embeddings, knowledge-graph, agent-memory
   Source: github.com/joeblackwaslike/memtree

7. **personal-agent-skills** — Category: productivity
   Description: Joe Black's private skills — stack preferences, marketplace publishing, Obsidian vault, Serena, Pi cluster, Upgraded Parts design system.
   Keywords: skills, private, personal, stack, obsidian, upgraded-parts
   Source: github.com/joeblackwaslike/personal-agent-skills

8. **create-ts-project** — Category: productivity
   Description: Scaffold and maintain production-ready TypeScript projects — the cookiecutter-uv equivalent for the TypeScript ecosystem. Includes /new and /update commands plus a skill covering interactive and agent-driven scaffold flows.
   Keywords: typescript, scaffold, cli, template, biome, eslint, vitest, docusaurus
   Source: github.com/joeblackwaslike/create-ts-project

### Codex CLI plugins (4)

1. **mcp-exec** — Category: execution
   (same description as above)

2. **memtree** — Category: memory
   (same description as above)

3. **agent-skills** — Category: productivity
   Description: Joe Black's custom skills for Codex CLI — agentic development, multi-provider plugin architecture, plugin development best practices, and working with AI coding agents.
   Keywords: skills, agent-development, plugin-development, agentic, multi-provider, codex
   Source: github.com/joeblackwaslike/agent-skills

4. **personal-agent-skills** — Category: productivity
   (same description as above)

---

## Section 3 — Writing (id: writing)

Section label: "Writing"
Section heading: "Notes from the frontier."

Three articles, each with: topic tag, linked title, read-time estimate.

1. Tag: "Claude Code" — "Building the Agent Marketplace for Claude Code" — 5 min read
2. Tag: "AI Agents" — "Lessons Learned: Automating AI Mistake Capture" — 8 min read
3. Tag: "Stack" — "The Agentic Stack: What I Use in 2025" — 6 min read

"All posts →" link below.

---

## Section 4 — Projects (id: projects)

Section label: "Projects"
Section heading: "Things I've shipped."

Grid of project cards, each with: icon, name, language/tech, description, GitHub link.

**AI / Agentic**
1. 📦 agent-marketplace — JavaScript — "The missing plugin registry for Claude Code and Codex CLI. Curated, battle-tested plugins installable in one command."
2. 🤖 codex-review-bot — TypeScript — "GitHub App that triggers AI-powered PR reviews via OpenAI. Automated code review on every pull request."
3. 🧠 lessons-learned — Claude Code Plugin — "Automatic mistake capture and proactive lesson injection for AI coding agents."
4. ⚙️ mcp-exec — Claude Code & Codex Plugin — "Sandboxed code execution MCP server — keeps intermediate results out of the context window so agents can run code without burning tokens."

**Full-Stack Apps**
5. 🔍 jobsearch-tracker — TypeScript — "Full-featured job search dashboard — applications, interviews, companies, contacts, and documents. TanStack Start + Supabase."

**Dev Tools / DX**
6. 🧰 idea-nursery — Shell · Python — "Monorepo nursery for nascent macOS tools and automations. Projects incubate here until they earn their own repo."
7. 🔌 ext-tool — Python — "Manage VS Code and Cursor extensions from a single TOML source of truth. Keep your editor setup reproducible."
8. 📄 resume-builder — TeX — "Dynamic LaTeX resume pipeline driven by YAML conforming to the jsonresume schema. Data-first, version-controlled."
9. 🍓 rpi-cluster-bootstrap — Shell — "Automated bootstrap scripts for a Raspberry Pi Kubernetes cluster. From bare metal to running nodes in one shot."

**Python Libraries**
10. 🗄️ quart-sqlalchemy — Python · ⭐22 — "Async SQLAlchemy extension for ASGI frameworks (Quart, FastAPI). Modern async-first ORM integration."
11. ₿ coinaddr — Python · ⭐20 — "Cryptocurrency address inspection and validation library. Supports Bitcoin, Ethereum, and more."
12. 💰 pricing — Python · ⭐3 — "Pricing classes and tools with CLDR-backed locale-aware formatting and currency exchange support."

**Templates**
13. 🍪 cookiecutter-uv — Python — "Production-ready Python project template using uv for fast, reproducible dependency management."
14. 📊 cookiecutter-ds — Python — "Cookiecutter template for Python data science projects. Opinionated structure for reproducible research."

**Infra**
15. ☁️ couchdiscover — Python — "CouchDB 2.0 autodiscovery using Kubernetes. Automatically clusters nodes as pods come up."

### Nursery sub-section

Sub-heading: "Things I'm hatching."
Description: "Small tools that are worth versioning but don't yet justify a standalone repo. Each one has a tracking issue — click to follow along."

Same grid, dashed card border, "incubating" badge, links to GitHub issues.

1. 🔀 claude-switcher — zsh — "Switch Claude Code account profiles (cu) from the shell, or set the VS Code global default via ~/.claude/settings.json."
2. 🐋 orb-autostop — bash · launchd — "Auto-stops OrbStack after 15 min idle and lazy-starts it on the first docker use via an oh-my-zsh plugin."
3. 🩺 pieces-babysitter — Python · launchd — "Watchdog for Pieces OS — restarts on crash and sends macOS notifications on state changes."
4. 📊 pieces-metrics — Python · launchd — "Collects Pieces OS runtime metrics (CPU, memory, uptime) into SQLite for local analysis."
5. 📓 obsidian-user-base — Python · uv — "Karpathy-style LLM-maintained wiki — watches Obsidian Clippings/ and auto-updates _wiki/ via Claude Code."
6. 🔐 openclaw-setup — bash · launchd — "One-command macOS installer for OpenClaw gateway + node host — secrets via 1Password, 6 launchd agents."

---

## Section 5 — Connect (id: connect)

Section heading: "Find me on the internet."

Four cards, each with icon, platform name, handle:
1. GitHub — @joeblackwaslike
2. Twitter / X — @joeblackwaslike
3. Substack — joeblackwaslike
4. Medium — @joeblackwaslike

---

## Footer

- Wordmark: "joeblack.nyc" (`.nyc` accented)
- "© Joe Black"
- "New York"
- MIT license link
