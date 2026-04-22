# Article Mining: Extracting Writing Ideas from Dev Work

A repeatable process for turning build sessions, experiments, and problem-solving into publishable content.

---

## Where the transcripts live

### Claude Code

Each project gets a folder of `.jsonl` session files:

```
~/.claude/projects/<project-slug>/<session-id>.jsonl
~/.claude/history.jsonl          # global cross-project history
```

Each line is a JSON object. The interesting fields:

```json
{
  "type": "user" | "assistant",
  "message": { "role": "...", "content": "..." },
  "timestamp": "2026-04-22T..."
}
```

Extract human turns for context, assistant turns for solutions and explanations.

### Claude Desktop

Conversations are stored in IndexedDB (LevelDB), not plain files. To get readable transcripts:

1. **claude.ai export** — Settings → Account → Export data → downloads a ZIP of all conversations as JSON
2. **Copy from UI** — for individual conversations, select all and paste into a file
3. The downloaded export format is `conversations.json`, an array of conversation objects with `chat_messages` arrays

---

## The extraction process

### Step 1: Collect raw material

```bash
# List all Claude Code projects with recent activity
ls -lt ~/.claude/projects/ | head -20

# Dump readable text from a project's sessions
for f in ~/.claude/projects/<slug>/*.jsonl; do
  jq -r 'select(.type == "user" or .type == "assistant") |
    "\(.type | ascii_upcase): \(.message.content | if type == "string" then . else .[0].text // "" end)"' \
    "$f" 2>/dev/null
done
```

### Step 2: Scan for article signals

Look for these patterns in the transcript — each is a candidate article:

| Signal | What it looks like |
|---|---|
| **Problem → non-obvious solution** | "It kept failing until I realized..." |
| **Repeated mistake corrected** | lessons-learned entries, user corrections |
| **Architecture decision** | "I went with X over Y because..." |
| **Footgun discovered** | "turns out this API/tool does something surprising" |
| **Pattern extracted from repetition** | Same kind of code written 3+ times → abstraction |
| **Tool/library used in unexpected way** | Using something outside its stated purpose |
| **Debug trail** | Long back-and-forth to resolve one specific issue |
| **Mental model shift** | Something that changed how you think about X |

### Step 3: Score candidates

Rate each idea on two axes:

- **Specificity** (1–3): Is this a real concrete problem or vague advice?
- **Novelty** (1–3): Has this been written about well already?

Only proceed with ideas scoring 4+. Skip anything that's a tutorial rehash.

### Step 4: Draft the hook first

Before outlining, write one sentence: *"Someone reads this because they want to \_\_\_ but instead learn \_\_\_."* If you can't fill that in, the idea isn't ready.

---

## Master list of article ideas

Sourced from sessions building joeblack.nyc, agent-marketplace, lessons-learned, and related work.

### AI / Claude Code

- **How I built a mistake-capture system that prevents Claude from repeating errors** — lessons-learned architecture, hook injection, session mining. High specificity, genuinely novel.

- **The CSS theming bug that Dark Reader was hiding** — `:root` vs `[data-theme]`, how a browser extension masked a fundamental architecture flaw for multiple sessions. Good debugging narrative.

- **Building a personal hub that isn't a portfolio** — joeblack.nyc as a hub vs portfolio distinction, design decisions, Vite + vanilla JS + GH Pages.

- **Why I store lessons in files instead of prompts** — persistence strategies for AI agent memory, tradeoffs between in-context, in-file, and in-model approaches.

- **Making Claude Code smarter with a plugin marketplace** — agent-marketplace architecture, `.claude-plugin/marketplace.json` schema, how plugins compose.

- **The `cu` command: switching Claude accounts from the shell** — helpers/zsh/claude-use.zsh, multi-account Claude Code setups for pro + vertex.

### Agentic development patterns

- **Hooks are the underrated feature of Claude Code** — pre/post tool hooks, lessons-learned injection, how hooks change the agent loop.

- **How I use Serena (LSP-backed code editing) instead of file reads** — semantic editing > text editing, why `replace_symbol_body` beats `Read + Edit`, token efficiency.

- **When to use subagents vs inline Claude Code** — orchestration patterns, when to dispatch parallel agents vs staying in one context.

- **The agentic stack in 2025: what I actually use** — honest breakdown of tools, what works, what's hype. (Already a writing card on the site — needs the actual article.)

### Python / backend

- **Why I rewrote Quart-SQLAlchemy as an ASGI extension** — pivot from Quart-specific to ASGI-generic, async SQLAlchemy 2.0 patterns, what broke in the original.

- **CLDR-backed pricing in Python** — `pricing` library, why locale-aware formatting matters, currency exchange at the library level.

- **Cryptocurrency address validation is harder than it looks** — `coinaddr` internals, the edge cases in Bitcoin/Ethereum/Litecoin address formats.

### Tooling / DX

- **One TOML to rule all your VS Code extensions** — `ext-tool`, declarative extension management, why this matters for reproducible dev environments.

- **A LaTeX resume pipeline driven by YAML** — `resume-builder`, jsonresume schema, why data-first beats template-first for resumes.

- **Bootstrapping a Raspberry Pi Kubernetes cluster from scratch** — `rpi-cluster-bootstrap`, bare-metal to running nodes, what the guides get wrong.

### Job search / career

- **Building a job search tracker because spreadsheets suck** — `jobsearch-tracker` architecture, TanStack Start + Supabase, the data model for tracking applications/interviews/contacts.

---

## Running this process regularly

Suggested cadence: **after every significant build sprint** (not after every session).

1. Pull recent `.jsonl` files, skim for signals
2. Add raw ideas to a scratch list (don't filter yet)
3. Score and filter weekly
4. Write hook sentences for anything scoring 4+
5. Pick one and write it

A batch Claude session works well for steps 1–2: paste a transcript dump and ask it to identify article signals using the table above.

---

## Notes

- Claude Desktop transcripts require manual export from claude.ai — do this monthly
- Claude Code history is always local and current at `~/.claude/history.jsonl`
- The lessons-learned plugin is itself a transcript mining system — its output (structured lessons) is a secondary source of article ideas
