# Design a single-page personal website for a developer named Joe Black with the following sections and content. Apply your own visual design — do not follow any existing design. The description below covers only structure and content.

---

## Site identity

- Site name / wordmark: "joeblack.nyc"
- The page has a light/dark mode toggle

---

## Navigation

Sticky top navigation bar containing:
- Wordmark on the left: "joeblack.nyc"
- Navigation links (right side): Plugins, Writing, Projects, Connect
- Icon links: GitHub, Twitter/X
- Light/dark mode toggle button

---

## Section 1 — Hero

Full-width hero section. Contains:
- A small avatar/monogram: "JB"
- A status chip reading "NYC · Building for the agentic era"
- Large heading: "Joe" / "Black." (two lines, second word is visually emphasized)
- Subheading paragraph: "I build tools, plugins, and systems at the frontier of AI agents. Currently obsessed with making Claude Code smarter."
- Two CTA buttons: "Explore Plugins" (primary) and "Get in Touch" (secondary/ghost)
- A subtle scroll indicator below the buttons

---

## Section 2 — Plugins (id: plugins)

Section label: "Claude Code Plugins"
Section heading: "Built for the agentic stack."
Section description: "Battle-tested plugins that make your AI coding agent smarter. Install the marketplace in one command."

One-line install snippet (copyable code block):
`claude plugin marketplace add joeblackwaslike/agent-marketplace`

Category filter pills: "All", plus dynamic categories from the plugin data.

Plugin cards (loaded dynamically from a JSON feed). Each card contains:
- Category label (top-left badge)
- Plugin name (heading)
- Description (body text)
- Keyword tags (small pills)
- Install command snippet with copy button: `claude plugin install <name>`
- Version number
- "Source →" link to GitHub

Current plugins:

1. **lessons-learned** — Category: productivity
    Description: Automatic mistake capture and proactive lesson injection for AI coding agents. Mines conversation logs for mistake patterns, structures them as indexed lessons, and injects relevant warnings before the agent repeats the mistake.
    Keywords: lessons, mistakes, hooks, memory, injection
    Source: github.com/joeblackwaslike/lessons-learned

2. **mcp-exec** — Category: execution
    Description: Sandboxed code execution MCP server — keep intermediate results out of the context window.
    Keywords: mcp, sandbox, execution, tools
    Source: github.com/joeblackwaslike/mcp-exec

---

## Section 3 — Writing (id: writing)

Section label: "Writing"
Section heading: "Notes from the frontier."

Three article cards, each containing:
- Topic tag
- Article title (linked)
- Read-time estimate

Articles:
1. Tag: "Claude Code" — "Building the Agent Marketplace for Claude Code" — 5 min read
2. Tag: "AI Agents" — "Lessons Learned: Automating AI Mistake Capture" — 8 min read
3. Tag: "Stack" — "The Agentic Stack: What I Use in 2025" — 6 min read

"All posts →" link below the cards.

---

## Section 4 — Projects (id: projects)

Section label: "Projects"
Section heading: "Things I've shipped."

A grid of project cards. Each card contains:
- An emoji icon
- Project name
- Language / tech label
- Short description
- "View on GitHub →" link

Projects:

**AI / Agentic**
1. 📦 agent-marketplace — JavaScript — "The missing plugin registry for Claude Code. Curated, battle-tested plugins installable in one command."
2. 🤖 codex-review-bot — TypeScript — "GitHub App that triggers AI-powered PR reviews via OpenAI. Automated code review on every pull request."
3. 🧠 lessons-learned — Claude Code Plugin — "Automatic mistake capture and proactive lesson injection for AI coding agents. Mines conversation logs and injects
warnings before an agent repeats a mistake."
4. ⚙️  mcp-exec — Claude Code Plugin — "Sandboxed code execution MCP server — keeps intermediate results out of the context window so agents can run code without burning tokens."

**Full-Stack Apps**
5. 🔍 jobsearch-tracker — TypeScript — "Full-featured job search dashboard — applications, interviews, companies, contacts, and documents. TanStack Start + Supabase."

**Dev Tools / DX**
6. 🧰 idea-nursery — Shell · Python — "Monorepo nursery for nascent macOS tools and automations. Projects incubate here until they earn their own repo." (links
to nursery section)
7. 🔌 ext-tool — Python — "Manage VS Code and Cursor extensions from a single TOML source of truth. Keep your editor setup reproducible."
8. 📄 resume-builder — TeX — "Dynamic LaTeX resume pipeline driven by YAML conforming to the jsonresume schema. Data-first, version-controlled."
9. 🍓 rpi-cluster-bootstrap — Shell — "Automated bootstrap scripts for a Raspberry Pi Kubernetes cluster. From bare metal to running nodes in one shot."

**Python Libraries**
10. 🗄️  quart-sqlalchemy — Python · ⭐22 — "Async SQLAlchemy extension for ASGI frameworks (Quart, FastAPI). Modern async-first ORM integration."
11. ₿ coinaddr — Python · ⭐20 — "Cryptocurrency address inspection and validation library. Supports Bitcoin, Ethereum, and more."
12. 💰 pricing — Python · ⭐3 — "Pricing classes and tools with CLDR-backed locale-aware formatting and currency exchange support."

**Templates**
13. 🍪 cookiecutter-uv — Python — "Production-ready Python project template using uv for fast, reproducible dependency management."
14. 📊 cookiecutter-ds — Python — "Cookiecutter template for Python data science projects. Opinionated structure for reproducible research."

**Infra**
15. ☁️  couchdiscover — Python — "CouchDB 2.0 autodiscovery using Kubernetes. Automatically clusters nodes as pods come up."

---

### Projects sub-section — Nursery

Sub-heading within the Projects section: "Things I'm hatching."
Description: "Small tools that are worth versioning but don't yet justify a standalone repo. Each one has a tracking issue — click to follow along."

Same grid layout as above but with a visual treatment indicating "incubating" status. Each card has an "incubating" status badge and links to a GitHub issue
instead of a repo.

Nursery projects:
1. 🔀 claude-switcher — zsh — "Switch Claude Code account profiles (cu) from the shell, or set the VS Code global default via ~/.claude/settings.json." — Track
issue →
2. 🐋 orb-autostop — bash · launchd — "Auto-stops OrbStack after 15 min idle and lazy-starts it on the first docker use via an oh-my-zsh plugin." — Track issue →
3. 🩺 pieces-babysitter — Python · launchd — "Watchdog for Pieces OS — restarts on crash and sends macOS notifications on state changes." — Track issue →
4. 📊 pieces-metrics — Python · launchd — "Collects Pieces OS runtime metrics (CPU, memory, uptime) into SQLite for local analysis." — Track issue →
5. 📓 obsidian-user-base — Python · uv — "Karpathy-style LLM-maintained wiki — watches Obsidian Clippings/ and auto-updates _wiki/ via Claude Code." — Track
issue →
6. 🔐 openclaw-setup — bash · launchd — "One-command macOS installer for OpenClaw gateway + node host — secrets via 1Password, 6 launchd agents." — Track issue →

---

## Section 5 — Connect (id: connect)

Section heading: "Find me on the internet."

Four social/contact cards in a grid, each with an icon, platform name, and handle:
1. GitHub — @joeblackwaslike
2. Twitter / X — @joeblackwaslike
3. Substack — joeblackwaslike
4. Medium — @joeblackwaslike

---

## Footer

- Wordmark: "joeblack.nyc"
- "© Joe Black"
- "New York"
- MIT license link

That's the full structural + content spec with zero design details — colors, fonts, spacing, and visual treatment are entirely open for Stitch to decide.