# Agent Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Claude Code plugin marketplace repo with a Vite-powered GitHub Pages site, CI validation, and registry manifest for `lessons-learned` and `mcp-exec`.

**Architecture:** Registry-only model — `.claude-plugin/marketplace.json` lists plugins hosted in their own separate repos. A Vite static site fetches that JSON at runtime to render the catalog. Three GitHub Actions workflows handle linting, validation, and Pages deployment.

**Tech Stack:** Git, JSON Schema (draft-07), Vite 5, Vitest 2, vanilla JS/CSS, GitHub Actions, `gh` CLI, `ajv-cli`, `prettier`

**Working directory:** `/Users/joeblack/github/joeblackwaslike/agent-marketplace`

---

### Task 1: Repo Scaffolding

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
site/dist/
site/.vite/
*.log
.DS_Store
.env
.env.local
```

- [ ] **Step 2: Create `LICENSE`**

```
MIT License

Copyright (c) 2026 Joe Black

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Agent Marketplace

> The Claude Code plugin marketplace by [Joe Black](https://github.com/joeblackwaslike).

**[Browse Plugins →](https://joeblackwaslike.github.io/agent-marketplace)**

## Install

Add this marketplace to Claude Code:

\`\`\`bash
claude plugin marketplace add joeblackwaslike/agent-marketplace
\`\`\`

Then install individual plugins:

\`\`\`bash
claude plugin install lessons-learned
claude plugin install mcp-exec
\`\`\`

## Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| [lessons-learned](https://github.com/joeblackwaslike/lessons-learned) | Automatic mistake capture and proactive lesson injection for AI coding agents | Productivity |
| [mcp-exec](https://github.com/joeblackwaslike/mcp-exec) | Sandboxed code execution MCP server — keep intermediate results out of the context window | Execution |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore LICENSE README.md
git commit -m "chore: add repo scaffolding"
```

---

### Task 2: JSON Schema

**Files:**
- Create: `schemas/marketplace.schema.json`

- [ ] **Step 1: Create `schemas/marketplace.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "metadata", "owner", "plugins"],
  "additionalProperties": false,
  "properties": {
    "name": { "type": "string" },
    "metadata": {
      "type": "object",
      "required": ["description", "version"],
      "additionalProperties": false,
      "properties": {
        "description": { "type": "string" },
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$"
        },
        "homepage": { "type": "string", "format": "uri" }
      }
    },
    "owner": {
      "type": "object",
      "required": ["name", "github"],
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string" },
        "github": { "type": "string" }
      }
    },
    "plugins": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "description", "source", "version", "category"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "source": {
            "type": "object",
            "required": ["source", "url"],
            "additionalProperties": false,
            "properties": {
              "source": { "type": "string", "enum": ["url"] },
              "url": {
                "type": "string",
                "pattern": "^https://github\\.com/.+\\.git$"
              },
              "ref": { "type": "string" }
            }
          },
          "version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+\\.\\d+$"
          },
          "category": {
            "type": "string",
            "enum": [
              "productivity",
              "execution",
              "security",
              "testing",
              "documentation",
              "utilities"
            ]
          },
          "keywords": {
            "type": "array",
            "items": { "type": "string" }
          },
          "strict": { "type": "boolean" }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Smoke-test the schema locally** (requires `ajv-cli` globally or via npx)

```bash
echo '{"name":"test","metadata":{"description":"d","version":"1.0.0"},"owner":{"name":"Joe","github":"joeblackwaslike"},"plugins":[{"name":"p","description":"d","source":{"source":"url","url":"https://github.com/x/y.git"},"version":"1.0.0","category":"productivity"}]}' | npx ajv-cli validate -s schemas/marketplace.schema.json -d /dev/stdin --spec=draft7 2>&1 | grep -E "valid|error"
```

Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
git add schemas/marketplace.schema.json
git commit -m "feat: add marketplace JSON schema"
```

---

### Task 3: Marketplace Manifest

**Files:**
- Create: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Create `.claude-plugin/marketplace.json`**

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
      "description": "Automatic mistake capture and proactive lesson injection for AI coding agents. Mines conversation logs for mistake patterns, structures them as indexed lessons, and injects relevant warnings before the agent repeats the mistake.",
      "source": {
        "source": "url",
        "url": "https://github.com/joeblackwaslike/lessons-learned.git"
      },
      "version": "0.1.0",
      "category": "productivity",
      "keywords": ["lessons", "mistakes", "hooks", "memory", "injection"]
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

- [ ] **Step 2: Validate against schema**

```bash
npx ajv-cli validate -s schemas/marketplace.schema.json -d .claude-plugin/marketplace.json --spec=draft7
```

Expected output: `.claude-plugin/marketplace.json valid`

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat: add marketplace manifest with lessons-learned and mcp-exec"
```

---

### Task 4: Site Scaffolding

**Files:**
- Create: `site/package.json`
- Create: `site/vite.config.js`

- [ ] **Step 1: Create `site/package.json`**

```json
{
  "name": "agent-marketplace-site",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `site/vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Install dependencies**

```bash
cd site && npm install
```

Expected: `node_modules/` created, `package-lock.json` written.

- [ ] **Step 4: Commit**

```bash
git add site/package.json site/vite.config.js site/package-lock.json
git commit -m "chore: add Vite site scaffolding"
```

---

### Task 5: Catalog Logic (TDD)

**Files:**
- Create: `site/tests/catalog.test.js` (write first)
- Create: `site/catalog.js` (implement after tests fail)

- [ ] **Step 1: Write failing tests — create `site/tests/catalog.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { getCategories, applyFilter, renderPluginCard, renderFilterPills } from '../catalog.js';

const plugins = [
  {
    name: 'lessons-learned',
    description: 'Automatic mistake capture.',
    source: { source: 'url', url: 'https://github.com/joeblackwaslike/lessons-learned.git' },
    version: '0.1.0',
    category: 'productivity',
    keywords: ['lessons', 'hooks'],
  },
  {
    name: 'mcp-exec',
    description: 'Sandboxed code execution.',
    source: { source: 'url', url: 'https://github.com/joeblackwaslike/mcp-exec.git' },
    version: '0.1.0',
    category: 'execution',
    keywords: ['mcp', 'sandbox'],
  },
];

describe('getCategories', () => {
  it('returns sorted unique categories', () => {
    expect(getCategories(plugins)).toEqual(['execution', 'productivity']);
  });

  it('deduplicates repeated categories', () => {
    const duped = [...plugins, { ...plugins[0] }];
    expect(getCategories(duped)).toEqual(['execution', 'productivity']);
  });
});

describe('applyFilter', () => {
  it('returns all plugins when category is "all"', () => {
    expect(applyFilter(plugins, 'all')).toHaveLength(2);
  });

  it('filters to matching category', () => {
    const result = applyFilter(plugins, 'execution');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('mcp-exec');
  });

  it('returns empty array when category has no matches', () => {
    expect(applyFilter(plugins, 'nonexistent')).toHaveLength(0);
  });
});

describe('renderPluginCard', () => {
  it('includes plugin name', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('lessons-learned');
  });

  it('includes install command', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('claude plugin install lessons-learned');
  });

  it('strips .git suffix from source URL', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('https://github.com/joeblackwaslike/lessons-learned"');
    expect(html).not.toContain('.git');
  });

  it('includes version with v prefix', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('v0.1.0');
  });

  it('includes all keywords', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('lessons');
    expect(html).toContain('hooks');
  });

  it('sets data-category attribute', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('data-category="productivity"');
  });
});

describe('renderFilterPills', () => {
  it('renders All pill before category pills', () => {
    const html = renderFilterPills(['execution', 'productivity'], 'all');
    expect(html.indexOf('>All<')).toBeLessThan(html.indexOf('execution'));
  });

  it('marks All pill as active when activeCategory is "all"', () => {
    const html = renderFilterPills(['execution'], 'all');
    const allPillSection = html.slice(0, html.indexOf('execution'));
    expect(allPillSection).toContain('active');
  });

  it('marks correct category pill as active', () => {
    const html = renderFilterPills(['execution', 'productivity'], 'execution');
    // Split on buttons to isolate the execution pill
    const execPill = html.match(/data-category="execution"[^>]*>[^<]*/)?.[0] ?? '';
    expect(execPill).toBeTruthy();
  });

  it('renders a pill for each category', () => {
    const html = renderFilterPills(['execution', 'productivity'], 'all');
    expect(html).toContain('data-category="execution"');
    expect(html).toContain('data-category="productivity"');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd site && npm test
```

Expected: FAIL with `Cannot find module '../catalog.js'`

- [ ] **Step 3: Implement `site/catalog.js`**

```js
export function getCategories(plugins) {
  return [...new Set(plugins.map(p => p.category))].sort();
}

export function applyFilter(plugins, category) {
  if (category === 'all') return plugins;
  return plugins.filter(p => p.category === category);
}

export function renderPluginCard(plugin) {
  const installCmd = `claude plugin install ${plugin.name}`;
  const sourceUrl = plugin.source.url.replace(/\.git$/, '');
  const keywords = plugin.keywords
    .map(k => `<span class="keyword">${k}</span>`)
    .join('');
  return `<article class="plugin-card" data-category="${plugin.category}">
  <div class="card-header">
    <h2>${plugin.name}</h2>
    <span class="category-badge category-${plugin.category}">${plugin.category}</span>
  </div>
  <p class="description">${plugin.description}</p>
  <div class="keywords">${keywords}</div>
  <div class="card-footer">
    <div class="install-snippet">
      <code>${installCmd}</code>
      <button class="copy-btn" data-cmd="${installCmd}" aria-label="Copy">Copy</button>
    </div>
    <div class="meta">
      <span class="version">v${plugin.version}</span>
      <a href="${sourceUrl}" target="_blank" rel="noopener">Source →</a>
    </div>
  </div>
</article>`;
}

export function renderFilterPills(categories, activeCategory) {
  const allPill = `<button class="pill${activeCategory === 'all' ? ' active' : ''}" data-category="all">All</button>`;
  const pills = categories.map(c =>
    `<button class="pill${activeCategory === c ? ' active' : ''}" data-category="${c}">${c}</button>`
  );
  return [allPill, ...pills].join('');
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd site && npm test
```

Expected: All tests PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add site/catalog.js site/tests/catalog.test.js
git commit -m "feat: add catalog pure functions with tests"
```

---

### Task 6: Site HTML

**Files:**
- Create: `site/index.html`

- [ ] **Step 1: Create `site/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="A curated collection of Claude Code plugins by Joe Black. Supercharge your AI coding agent." />
    <title>Agent Marketplace — Claude Code Plugins</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header class="hero">
      <div class="hero-inner">
        <h1>Agent Marketplace</h1>
        <p class="tagline">Supercharge your AI coding agent with battle-tested Claude Code plugins.</p>
        <div class="install-block">
          <code id="install-cmd">claude plugin marketplace add joeblackwaslike/agent-marketplace</code>
          <button id="hero-copy-btn" aria-label="Copy install command">Copy</button>
        </div>
        <a
          class="github-badge"
          href="https://github.com/joeblackwaslike/agent-marketplace"
          target="_blank"
          rel="noopener"
        >
          <img
            src="https://img.shields.io/github/stars/joeblackwaslike/agent-marketplace?style=social"
            alt="GitHub Stars"
          />
        </a>
      </div>
    </header>

    <main>
      <section class="filters" aria-label="Filter plugins">
        <div id="filter-pills" role="group" aria-label="Category filters"></div>
      </section>
      <section class="catalog" aria-label="Plugin catalog">
        <div id="plugin-grid"></div>
      </section>
    </main>

    <footer>
      <a href="https://github.com/joeblackwaslike/agent-marketplace">GitHub</a>
      <a href="https://github.com/joeblackwaslike/agent-marketplace/blob/main/CONTRIBUTING.md">Contributing</a>
      <a href="https://github.com/joeblackwaslike/agent-marketplace/blob/main/LICENSE">MIT License</a>
    </footer>

    <script type="module" src="./main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Verify Vite dev server starts**

```bash
cd site && npm run dev
```

Expected: `Local: http://localhost:5173/` — open in browser and confirm the page shell renders (no plugins yet, that's fine).

Kill the dev server with `Ctrl-C`.

- [ ] **Step 3: Commit**

```bash
git add site/index.html
git commit -m "feat: add site HTML shell"
```

---

### Task 7: Site CSS

**Files:**
- Create: `site/style.css`

- [ ] **Step 1: Create `site/style.css`**

```css
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --accent: #58a6ff;
  --code-bg: #1f2428;
  --green: #3fb950;
  --purple: #bc8cff;
  --orange: #ffa657;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  line-height: 1.6;
  min-height: 100vh;
}

/* ── Hero ── */
.hero {
  padding: 80px 24px 60px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, #0d1117 0%, #161b22 100%);
}

.hero-inner {
  max-width: 720px;
  margin: 0 auto;
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #e6edf3 0%, #58a6ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 32px;
}

.install-block {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
  max-width: 100%;
}

.install-block code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

button {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  padding: 4px 10px;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.github-badge {
  display: inline-block;
  margin-top: 8px;
}

/* ── Filters ── */
.filters {
  max-width: 1100px;
  margin: 32px auto 0;
  padding: 0 24px;
}

#filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 6px 16px;
  text-transform: capitalize;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}

/* ── Catalog grid ── */
.catalog {
  max-width: 1100px;
  margin: 24px auto 80px;
  padding: 0 24px;
}

#plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

/* ── Plugin card ── */
.plugin-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
}

.plugin-card:hover {
  border-color: var(--accent);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-header h2 {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 600;
}

.category-badge {
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.category-productivity { background: rgba(63, 185, 80, 0.15); color: var(--green); }
.category-execution    { background: rgba(88, 166, 255, 0.15); color: var(--accent); }
.category-security     { background: rgba(255, 166, 87, 0.15); color: var(--orange); }
.category-testing      { background: rgba(188, 140, 255, 0.15); color: var(--purple); }
.category-documentation{ background: rgba(88, 166, 255, 0.15); color: var(--accent); }
.category-utilities    { background: rgba(139, 148, 158, 0.15); color: var(--text-muted); }

.description {
  color: var(--text-muted);
  font-size: 0.9rem;
  flex: 1;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword {
  background: var(--code-bg);
  border-radius: 4px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 2px 8px;
}

.card-footer {
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
}

.install-snippet {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--code-bg);
  border-radius: 6px;
  padding: 8px 12px;
}

.install-snippet code {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.version {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta a {
  color: var(--accent);
  font-size: 0.82rem;
  text-decoration: none;
}

.meta a:hover {
  text-decoration: underline;
}

.error {
  color: #f85149;
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
}

/* ── Footer ── */
footer {
  border-top: 1px solid var(--border);
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 32px 24px;
}

footer a {
  color: var(--text-muted);
  font-size: 0.85rem;
  text-decoration: none;
}

footer a:hover {
  color: var(--accent);
}

/* ── Responsive ── */
@media (max-width: 600px) {
  h1 { font-size: 2rem; }
  .install-block { flex-direction: column; align-items: flex-start; }
  #plugin-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Run dev server and verify dark theme renders correctly**

```bash
cd site && npm run dev
```

Open `http://localhost:5173` — confirm dark background, gradient headline, monospace install block. Kill with `Ctrl-C`.

- [ ] **Step 3: Commit**

```bash
git add site/style.css
git commit -m "feat: add dark-theme site CSS"
```

---

### Task 8: Site Main JS

**Files:**
- Create: `site/main.js`

- [ ] **Step 1: Create `site/main.js`**

```js
import { getCategories, applyFilter, renderPluginCard, renderFilterPills } from './catalog.js';

const MARKETPLACE_URL =
  import.meta.env.VITE_MARKETPLACE_URL ||
  '/.claude-plugin/marketplace.json';

function attachCopyListeners(container) {
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.cmd).then(() => {
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = prev; }, 2000);
      });
    });
  });
}

async function init() {
  const grid = document.getElementById('plugin-grid');
  const filterContainer = document.getElementById('filter-pills');
  const heroCopyBtn = document.getElementById('hero-copy-btn');
  const installCmd = document.getElementById('install-cmd');

  // Hero copy button
  heroCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(installCmd.textContent).then(() => {
      heroCopyBtn.textContent = 'Copied!';
      setTimeout(() => { heroCopyBtn.textContent = 'Copy'; }, 2000);
    });
  });

  let plugins = [];
  let activeCategory = 'all';

  try {
    const res = await fetch(MARKETPLACE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    plugins = data.plugins;
  } catch {
    grid.innerHTML = '<p class="error">Failed to load plugins. Please refresh or check back later.</p>';
    return;
  }

  function render() {
    const categories = getCategories(plugins);
    const filtered = applyFilter(plugins, activeCategory);

    filterContainer.innerHTML = renderFilterPills(categories, activeCategory);
    grid.innerHTML = filtered.map(renderPluginCard).join('');

    filterContainer.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        render();
      });
    });

    attachCopyListeners(grid);
  }

  render();
}

init();
```

- [ ] **Step 2: Test full flow in dev server**

```bash
cd site && npm run dev
```

Open `http://localhost:5173`. The plugin grid won't load (fetch to `/.claude-plugin/marketplace.json` will 404 in dev). To verify the catalog renders correctly, temporarily add this to the browser console:

```js
// paste in devtools console to simulate the fetch
window.__plugins = [{"name":"lessons-learned","description":"Automatic mistake capture.","source":{"source":"url","url":"https://github.com/joeblackwaslike/lessons-learned.git"},"version":"0.1.0","category":"productivity","keywords":["lessons","hooks"]}]
```

Verify no JS errors in the console. Kill dev server.

- [ ] **Step 3: Commit**

```bash
git add site/main.js
git commit -m "feat: wire catalog to DOM with fetch and filter"
```

---

### Task 9: GitHub Actions — Lint

**Files:**
- Create: `.github/workflows/lint.yml`

- [ ] **Step 1: Create `.github/workflows/lint.yml`**

```yaml
name: Lint

on:
  pull_request:
    paths:
      - '**/*.json'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install prettier
        run: npm install -g prettier

      - name: Check JSON formatting
        run: prettier --check "**/*.json" --ignore-path .gitignore
```

- [ ] **Step 2: Verify JSON files are already prettier-formatted**

```bash
npx prettier --check "**/*.json" --ignore-path .gitignore
```

Expected: All match. If any fail, run `npx prettier --write "**/*.json" --ignore-path .gitignore` and re-check.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/lint.yml
git commit -m "ci: add JSON lint workflow"
```

---

### Task 10: GitHub Actions — Validate

**Files:**
- Create: `.github/workflows/validate.yml`

- [ ] **Step 1: Create `.github/workflows/validate.yml`**

```yaml
name: Validate Marketplace

on:
  pull_request:
    paths:
      - '.claude-plugin/marketplace.json'
      - 'schemas/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ajv-cli
        run: npm install -g ajv-cli@5 ajv-formats

      - name: Validate marketplace.json against schema
        run: |
          ajv validate \
            -s schemas/marketplace.schema.json \
            -d .claude-plugin/marketplace.json \
            --spec=draft7

      - name: Check plugin source URLs resolve
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          jq -r '.plugins[].source.url' .claude-plugin/marketplace.json | while read url; do
            repo="${url#https://github.com/}"
            repo="${repo%.git}"
            echo "Checking repo: $repo"
            gh api "repos/$repo" --silent
            echo "  ✓ $repo exists"
          done
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/validate.yml
git commit -m "ci: add marketplace validation workflow"
```

---

### Task 11: GitHub Actions — Deploy Pages

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Create `.github/workflows/deploy-pages.yml`**

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: site/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: site

      - name: Build
        run: npm run build
        working-directory: site
        env:
          VITE_MARKETPLACE_URL: https://raw.githubusercontent.com/joeblackwaslike/agent-marketplace/main/.claude-plugin/marketplace.json

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: site/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify Vite builds cleanly**

```bash
cd site && VITE_MARKETPLACE_URL=https://raw.githubusercontent.com/joeblackwaslike/agent-marketplace/main/.claude-plugin/marketplace.json npm run build
```

Expected: `dist/` created with `index.html`, `assets/` dir. No errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "ci: add GitHub Pages deploy workflow"
```

---

### Task 12: GitHub Metadata & Docs

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/index.md`

- [ ] **Step 1: Create `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## What does this PR do?

<!-- Brief description of the change -->

## Type of change

- [ ] Bug fix in an existing plugin
- [ ] Plugin version update in `marketplace.json`
- [ ] Documentation improvement
- [ ] Infrastructure / CI improvement
- [ ] Other (describe below)

## Checklist

- [ ] JSON files pass formatting (`npx prettier --check "**/*.json" --ignore-path .gitignore`)
- [ ] `marketplace.json` validates against schema (`npx ajv-cli validate -s schemas/marketplace.schema.json -d .claude-plugin/marketplace.json --spec=draft7`)
- [ ] Site tests pass if applicable (`cd site && npm test`)
```

- [ ] **Step 2: Create `.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
---
name: Bug Report
about: Report a bug in the marketplace site or a plugin listing
title: '[Bug] '
labels: bug
assignees: joeblackwaslike
---

## Describe the bug

<!-- A clear description of what the bug is -->

## To reproduce

<!-- Steps to reproduce the behavior -->

## Expected behavior

<!-- What you expected to happen -->

## Environment

- OS:
- Claude Code version:
- Browser (if site bug):
- Plugin version:
```

- [ ] **Step 3: Create `CONTRIBUTING.md`**

```markdown
# Contributing

Contributions are welcome! This is Joe Black's personal Claude Code plugin collection. PRs should improve existing plugins or the marketplace infrastructure.

## What We Accept

- Bug fixes and improvements to existing plugins
- Plugin version bumps in `marketplace.json`
- Documentation improvements
- Infrastructure / CI improvements (workflows, schema, site)

## What We Don't Accept

- New plugins from other authors — each plugin lives in its own repo. Want to list your plugin? [Open a discussion](https://github.com/joeblackwaslike/agent-marketplace/discussions).

## Development Setup

```bash
git clone https://github.com/joeblackwaslike/agent-marketplace.git
cd agent-marketplace/site
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # run catalog unit tests
```

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b fix/your-fix`
3. Make your changes
4. Run `cd site && npm test` (if touching `catalog.js`)
5. Run `npx prettier --write "**/*.json" --ignore-path .gitignore` to format JSON
6. Open a PR — the template will guide you

## Bumping a Plugin Version

Edit `.claude-plugin/marketplace.json`, update the `version` field for the relevant plugin, and submit a PR. CI will verify the source URL still resolves.
```

- [ ] **Step 4: Create `docs/index.md`**

```markdown
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
```

- [ ] **Step 5: Commit**

```bash
git add .github/ CONTRIBUTING.md docs/index.md
git commit -m "docs: add contributing guide, PR/issue templates, and plugin docs"
```

---

### Task 13: Create GitHub Repo and Push

- [ ] **Step 1: Create the GitHub repository**

```bash
gh repo create joeblackwaslike/agent-marketplace \
  --public \
  --description "A curated collection of Claude Code plugins by Joe Black" \
  --homepage "https://joeblackwaslike.github.io/agent-marketplace"
```

Expected: `✓ Created repository joeblackwaslike/agent-marketplace on GitHub`

- [ ] **Step 2: Add remote and push**

```bash
git remote add origin https://github.com/joeblackwaslike/agent-marketplace.git
git push -u origin main
```

Expected: Branch `main` pushed, all commits visible on GitHub.

- [ ] **Step 3: Enable GitHub Pages in repo settings**

```bash
gh api repos/joeblackwaslike/agent-marketplace/pages \
  --method POST \
  --field source='{"branch":"gh-pages","path":"/"}' \
  --field build_type=workflow \
  2>/dev/null || echo "Pages may already be configured — verify in GitHub UI"
```

If that fails, enable manually: repo → Settings → Pages → Source: **GitHub Actions**.

- [ ] **Step 4: Verify deploy workflow runs**

```bash
gh run list --repo joeblackwaslike/agent-marketplace --limit 5
```

Wait for the `Deploy GitHub Pages` workflow to complete (green). Then:

```bash
gh run watch --repo joeblackwaslike/agent-marketplace $(gh run list --repo joeblackwaslike/agent-marketplace --workflow deploy-pages.yml --json databaseId --jq '.[0].databaseId')
```

- [ ] **Step 5: Verify the live site**

Open `https://joeblackwaslike.github.io/agent-marketplace` in a browser.

Confirm:
- Hero renders with gradient headline and install command
- Both plugin cards appear (lessons-learned, productivity; mcp-exec, execution)
- Category filter pills work
- Copy buttons copy to clipboard
- Source links open correct GitHub repos

---

## Verification Checklist

- [ ] `claude plugin marketplace add joeblackwaslike/agent-marketplace` installs without error
- [ ] `claude plugin install lessons-learned` resolves to `github.com/joeblackwaslike/lessons-learned`
- [ ] `claude plugin install mcp-exec` resolves to `github.com/joeblackwaslike/mcp-exec`
- [ ] Opening a PR that sets a plugin URL to a nonexistent repo causes `validate.yml` to fail
- [ ] Pushing to `main` triggers `deploy-pages.yml` and site updates at GitHub Pages URL
- [ ] `cd site && npm test` passes (14 tests, all green)
- [ ] `npx prettier --check "**/*.json" --ignore-path .gitignore` exits 0
