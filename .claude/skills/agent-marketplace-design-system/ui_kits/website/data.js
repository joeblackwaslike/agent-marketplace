/* Content data for the joeblack.nyc hub — lifted from the source
   design/personal-site/CONTENT.md + repo README. */
window.DATA = {
  plugins: [
    { name: "lessons-learned", category: "productivity", version: "0.4.2",
      description: "Automatic mistake capture and proactive lesson injection for AI coding agents. Mines conversation logs and injects warnings before the agent repeats a mistake.",
      keywords: ["lessons", "mistakes", "hooks", "memory"], repo: "joeblackwaslike/lessons-learned" },
    { name: "mcp-exec", category: "execution", version: "1.2.0",
      description: "Sandboxed code execution MCP server — keep intermediate results out of the context window. Cut token usage 80–95% on multi-tool workflows.",
      keywords: ["mcp", "sandbox", "execution", "tools"], repo: "joeblackwaslike/mcp-exec" },
    { name: "gstack", category: "productivity", version: "2.1.0",
      description: "Garry Tan's exact Claude Code setup — 23 opinionated tools that act as CEO, designer, eng manager, release manager, and QA.",
      keywords: ["workflow", "ship", "review", "qa"], repo: "joeblackwaslike/gstack" },
    { name: "anti-compact", category: "productivity", version: "0.3.0",
      description: "Intercepts /compact and generates a structured session handoff instead of lossy compaction — never lose context to a summarize step again.",
      keywords: ["context", "handoff", "session"], repo: "joeblackwaslike/anti-compact" },
    { name: "memtree", category: "memory", version: "1.0.0",
      description: "Tree/graph-based persistent context store for Claude Code sessions. SQLite-backed codebase navigation and cross-session recall.",
      keywords: ["memory", "sqlite", "graph", "recall"], repo: "joeblackwaslike/memtree" },
    { name: "agent-skills", category: "productivity", version: "0.9.1",
      description: "Joe Black's custom skills for agentic development and Claude Code plugin authoring. Batteries-included building blocks.",
      keywords: ["skills", "authoring", "agents"], repo: "joeblackwaslike/agent-skills" },
  ],
  writing: [
    { tag: "Claude Code", title: "Building the Agent Marketplace for Claude Code", read: "5 min read" },
    { tag: "AI Agents", title: "Lessons Learned: Automating AI Mistake Capture", read: "8 min read" },
    { tag: "Stack", title: "The Agentic Stack: What I Use in 2025", read: "6 min read" },
  ],
  projects: [
    { group: "AI / Agentic", items: [
      { name: "agent-marketplace", lang: "JavaScript", mark: "javascript", desc: "The missing plugin registry for Claude Code. Curated, battle-tested plugins installable in one command." },
      { name: "codex-review-bot", lang: "TypeScript", mark: "typescript", desc: "GitHub App that triggers AI-powered PR reviews via OpenAI. Automated code review on every pull request." },
      { name: "lessons-learned", lang: "Claude Code Plugin", mark: "claude", desc: "Automatic mistake capture and proactive lesson injection — injects warnings before an agent repeats a mistake." },
      { name: "mcp-exec", lang: "Claude Code Plugin", mark: "claude", desc: "Sandboxed code execution MCP server — keeps intermediate results out of the context window." },
    ]},
    { group: "Full-Stack & Dev Tools", items: [
      { name: "jobsearch-tracker", lang: "TypeScript", mark: "typescript", desc: "Full-featured job search dashboard — applications, interviews, contacts, documents. TanStack Start + Supabase." },
      { name: "ext-tool", lang: "Python", mark: "python", desc: "Manage VS Code & Cursor extensions from a single TOML source of truth. Reproducible editor setup." },
      { name: "resume-builder", lang: "TeX", mark: "TX", desc: "Dynamic LaTeX resume pipeline driven by YAML conforming to the jsonresume schema. Data-first." },
    ]},
    { group: "Python Libraries", items: [
      { name: "quart-sqlalchemy", lang: "Python · ★22", mark: "python", desc: "Async SQLAlchemy extension for ASGI frameworks (Quart, FastAPI). Modern async-first ORM integration." },
      { name: "coinaddr", lang: "Python · ★20", mark: "python", desc: "Cryptocurrency address inspection and validation. Supports Bitcoin, Ethereum, and more." },
      { name: "pricing", lang: "Python · ★3", mark: "python", desc: "Pricing classes with CLDR-backed locale-aware formatting and currency exchange support." },
    ]},
  ],
  nursery: [
    { name: "claude-switcher", lang: "zsh", desc: "Switch Claude Code account profiles (cu) from the shell, or set the VS Code global default." },
    { name: "orb-autostop", lang: "bash · launchd", desc: "Auto-stops OrbStack after 15 min idle and lazy-starts it on the first docker use." },
    { name: "pieces-babysitter", lang: "Python · launchd", desc: "Watchdog for Pieces OS — restarts on crash and sends macOS notifications on state changes." },
    { name: "obsidian-user-base", lang: "Python · uv", desc: "Karpathy-style LLM-maintained wiki — watches Obsidian Clippings and auto-updates _wiki/ via Claude." },
  ],
  connect: [
    { name: "GitHub", handle: "@joeblackwaslike", icon: "github" },
    { name: "Twitter / X", handle: "@joeblackwaslike", icon: "x" },
    { name: "Substack", handle: "joeblackwaslike", icon: "substack" },
    { name: "Medium", handle: "@joeblackwaslike", icon: "medium" },
  ],
};
