# Agent Marketplace

A curated collection of Claude Code plugins by Joe Black.

## Install the Marketplace

```bash
claude plugin marketplace add joeblackwaslike/agent-marketplace
```

## Plugins

### lessons-learned

Automatically captures mistakes from AI coding sessions and injects relevant warnings before the agent repeats them. Mines conversation logs for mistake patterns, structures them as indexed lessons, and surfaces them at session start.

**Install:**
```bash
claude plugin install lessons-learned
```

**Source:** [github.com/joeblackwaslike/lessons-learned](https://github.com/joeblackwaslike/lessons-learned)

---

### mcp-exec

A sandboxed code execution MCP server. Keeps intermediate results (scratch work, exploratory output) out of the main context window, reducing noise and token usage.

**Install:**
```bash
claude plugin install mcp-exec
```

**Source:** [github.com/joeblackwaslike/mcp-exec](https://github.com/joeblackwaslike/mcp-exec)
