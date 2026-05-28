# Agent Marketplace

[![Discord](https://img.shields.io/discord/1486035859747897414?logo=discord&label=Discord&color=5865F2)](https://discord.com/channels/1486035859747897414/1509515233595752538) [![Join Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/Fjc9zYHZyV)


> A plugin marketplace for Claude Code and Codex CLI, by [Joe Black](https://github.com/joeblackwaslike).

**[Browse Plugins →](https://joeblackwaslike.github.io/agent-marketplace)**

## Claude Code

Add this marketplace to Claude Code:

```bash
claude plugin marketplace add joeblackwaslike/agent-marketplace
```

Then install individual plugins:

```bash
claude plugin install lessons-learned
claude plugin install mcp-exec
```

### Claude Code Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| [lessons-learned](https://github.com/joeblackwaslike/lessons-learned) | Automatic mistake capture and proactive lesson injection for AI coding agents | Productivity |
| [mcp-exec](https://github.com/joeblackwaslike/mcp-exec) | Sandboxed code execution MCP server — keep intermediate results out of the context window | Execution |
| [gstack](https://github.com/joeblackwaslike/gstack) | Garry Tan's 47-skill workflow suite (ship, review, qa, browse, and more) | Productivity |
| [agent-skills](https://github.com/joeblackwaslike/agent-skills) | Joe Black's custom skills for agentic development and Claude Code plugin dev | Productivity |
| [anti-compact](https://github.com/joeblackwaslike/anti-compact) | Structured session handoff instead of lossy context compaction | Productivity |
| [memtree](https://github.com/joeblackwaslike/memtree) | Persistent SQLite graph store for codebase navigation and cross-session recall | Memory |

## Codex CLI

Add this marketplace to Codex CLI:

```bash
codex plugin marketplace add joeblackwaslike/agent-marketplace
```

Then install individual plugins:

```bash
codex plugin install mcp-exec
codex plugin install memtree
```

### Codex CLI Plugins

MCP-server plugins that work with any agent CLI supporting the Model Context Protocol.

| Plugin | Description | Category |
|--------|-------------|----------|
| [mcp-exec](https://github.com/joeblackwaslike/mcp-exec) | Sandboxed code execution MCP server — keep intermediate results out of the context window | Execution |
| [memtree](https://github.com/joeblackwaslike/memtree) | Persistent SQLite graph store for codebase navigation and cross-session recall | Memory |

## Nursery

Small tools that incubate here until they earn a standalone repo. Use `/adopt` to bring in a project and `/promote` to graduate it.

| Project | What it does | Issue |
|---------|-------------|-------|
| [claude-switcher](nursery/claude-switcher/) | Switch Claude Code account profiles (`cu`) from the shell or set the VS Code global default | [#1](https://github.com/joeblackwaslike/agent-marketplace/issues/1) |
| [orb-autostop](nursery/orb-autostop/) | Auto-stop OrbStack after 15 min idle; lazy-start on first `docker` use | [#2](https://github.com/joeblackwaslike/agent-marketplace/issues/2) |
| [pieces-babysitter](nursery/pieces-babysitter/) | Watchdog that restarts Pieces OS on crash and sends macOS notifications | [#3](https://github.com/joeblackwaslike/agent-marketplace/issues/3) |
| [pieces-metrics](nursery/pieces-metrics/) | Collects Pieces OS runtime metrics (CPU/mem/uptime) into SQLite | [#4](https://github.com/joeblackwaslike/agent-marketplace/issues/4) |
| [obsidian-user-base](nursery/obsidian-user-base/) | Karpathy-style LLM-maintained wiki: watches Obsidian Clippings and auto-updates `_wiki/` via Claude | [#5](https://github.com/joeblackwaslike/agent-marketplace/issues/5) |
| [openclaw-setup](nursery/openclaw-setup/) | One-command macOS installer for OpenClaw gateway + node host — secrets via 1Password + launchd | [#6](https://github.com/joeblackwaslike/agent-marketplace/issues/6) |

### Project lifecycle

```
/adopt <local-path>          adopt a local dir → nursery/<name>/
        ↓
   nursery/<name>/          incubates here, tracked by a GitHub issue
        ↓
/promote <name>              graduate → standalone github.com/joeblackwaslike/<name>
```

Bootstrap all nursery projects on a new machine:

```bash
./bootstrap.sh
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
