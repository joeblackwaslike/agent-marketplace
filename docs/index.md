# Agent Marketplace

A curated collection of plugins for Claude Code and Codex CLI, by Joe Black.

## Claude Code

### Install the Marketplace

```bash
claude plugin marketplace add joeblackwaslike/agent-marketplace
```

### Plugins

#### lessons-learned

Automatically captures mistakes from AI coding sessions and injects relevant warnings before the agent repeats them. Mines conversation logs for mistake patterns, structures them as indexed lessons, and surfaces them at session start.

**Install:**
```bash
claude plugin install lessons-learned
```

**Source:** [github.com/joeblackwaslike/lessons-learned](https://github.com/joeblackwaslike/lessons-learned)

---

#### mcp-exec

A sandboxed code execution MCP server. Keeps intermediate results (scratch work, exploratory output) out of the main context window, reducing noise and token usage.

**Install:**
```bash
claude plugin install mcp-exec
```

**Source:** [github.com/joeblackwaslike/mcp-exec](https://github.com/joeblackwaslike/mcp-exec)

---

## Codex CLI

MCP-server plugins that work with any agent CLI supporting the Model Context Protocol.

### Add to Codex

```bash
codex plugin marketplace add joeblackwaslike/agent-marketplace
```

### Codex Plugins

#### mcp-exec (Codex)

A sandboxed code execution MCP server. Keeps intermediate results (scratch work, exploratory output) out of the main context window, reducing noise and token usage.

**Install:**
```bash
codex plugin install mcp-exec
```

**Source:** [github.com/joeblackwaslike/mcp-exec](https://github.com/joeblackwaslike/mcp-exec)

---

#### memtree (Codex)

Persistent graph store for codebase and web navigation. Symbol-chunks files, stores nodes in a SQLite graph, and returns compact references. Enables recall across sessions without re-reading files via `memtree_search`, `memtree_neighbors`, and `memtree_compose`.

**Install:**
```bash
codex plugin install memtree
```

**Source:** [github.com/joeblackwaslike/memtree](https://github.com/joeblackwaslike/memtree)
