# Phosphor — Agent Marketplace / joeblack.nyc Design System

> A terminal-grade design system for **Joe Black's** personal hub at **ai.joeblack.nyc** —
> the home for his Claude Code & Codex CLI plugins, writing, and AI/agentic projects.

This system is the deliberate **antidote** to the current public site
(<https://joeblackwaslike.github.io/agent-marketplace/>), which Joe dislikes:
an AI-generated indigo→violet→pink gradient look with grain, glow blobs, and
three competing display fonts. **Phosphor throws all of that out** and replaces it
with one confident idea: a developer's terminal, rendered at premium fidelity.

---

## 1. Product context

**Agent Marketplace** (public URL: `ai.joeblack.nyc`; repo home page lives at
`joeblackwaslike.github.io/agent-marketplace`) is a personal **hub** for Joe Black,
a developer building at the frontier of AI agents. It does several jobs at once:

| Surface | What it is |
|---|---|
| **Plugins** | A curated marketplace of Claude Code & Codex CLI plugins (`lessons-learned`, `mcp-exec`, `gstack`, `agent-skills`, `anti-compact`, `memtree`). Installable in one command. |
| **Writing** | Long-form notes published via Medium / Substack — "Notes from the frontier." |
| **Projects** | Everything Joe has shipped: AI/agentic tools, full-stack apps, dev tooling, Python libraries, templates, infra. Plus a **Nursery** of small tools "incubating" until they earn their own repo. |
| **Connect** | A social hub linking GitHub, X/Twitter, Substack, Medium (and Discord for the marketplace community). |

The product personality is **builder-frontier**: someone shipping sharp tools for the
agentic era, who lives in a terminal and a code editor. The plugin install command —
`claude plugin marketplace add joeblackwaslike/agent-marketplace` — *is* the brand's
primary call to action.

### Information architecture (single-page hub)
`Hero → Plugins → Writing → Projects (+ Nursery) → Connect → Footer`, with a sticky
top nav (`Plugins · Writing · Projects · Connect`), GitHub/X icon links, and a
light/dark toggle.

---

## 2. Sources

Everything here was derived from materials Joe provided. The reader may not have
access, but they are recorded so this system stays traceable and so you can go
deeper to build higher-fidelity designs:

- **Primary repo:** <https://github.com/joeblackwaslike/agent-marketplace>
  - `README.md` — plugin catalog, marketplace install flow, nursery lifecycle.
  - `design/personal-site/CONTENT.md` — the canonical **content + IA spec** (sections,
    copy, plugin/project/writing data). Note: it specifies *structure and content only*
    and explicitly hands visual design to the implementer.
  - `site/` — the **current** implementation (`index.html`, `style.css`, `catalog.js`,
    `main.js`). Studied as the "before" we are replacing; class names like
    `.plugin-card`, `.card-category`, `.pill` come from here and are referenced by tests.
  - `CLAUDE.md` / `AGENTS.md` — agent workflow rules (beads issue tracker), **not** brand voice.
- **Current live site (the design being replaced):** <https://joeblackwaslike.github.io/agent-marketplace/>
- **Plugin / project repos** referenced throughout (worth exploring to build richer designs):
  `lessons-learned`, `mcp-exec`, `gstack`, `agent-skills`, `anti-compact`, `memtree`,
  `codex-review-bot`, `jobsearch-tracker`, `idea-nursery`, `ext-tool`, `resume-builder`,
  `quart-sqlalchemy`, `coinaddr`, `pricing` — all under <https://github.com/joeblackwaslike>.
- **Brand/social glyphs:** imported from [simple-icons](https://github.com/simple-icons/simple-icons)
  (`github`, `x`, `substack`, `medium`, `discord`, `anthropic`, `claude`, plus language marks).

> **Explore the source repos** to do an even better job: the plugin READMEs carry the
> real product voice, feature lists, and command surfaces you can pull copy from.

---

## 3. Content fundamentals — how Agent Marketplace writes

The voice is a **confident builder in a terminal**: precise, technically fluent,
lightly playful, never corporate. It assumes the reader is also technical.

- **Person & address.** First-person "I" for Joe ("I build tools, plugins, and systems…"),
  second-person "you/your" when talking to the developer ("make *your* AI coding agent smarter").
- **Tone.** Direct, energetic, a little swaggering — but earns it with specifics.
  "Battle-tested," "frontier," "obsessed," "in one command." Confidence over hype.
- **Casing.** **Sentence case** for headings and body. **lowercase** for the wordmark
  (`joeblack.nyc`), package names, and all commands (`claude plugin install mcp-exec`).
  **UPPERCASE** is reserved for the wide-tracked mono micro-labels (eyebrows, badges:
  `CLAUDE CODE PLUGINS`, `PRODUCTIVITY`, `EXECUTION`).
- **Headline pattern.** Short declarative statements, often with a period:
  *"Built for the agentic stack."* · *"Notes from the frontier."* ·
  *"Things I've shipped."* · *"Things I'm hatching."* · *"Find me on the internet."*
- **Section eyebrows** are terse category labels: `Claude Code Plugins`, `Writing`,
  `Projects`, `Connect`.
- **Plugin/project descriptions** are one tight sentence stating the *job to be done*,
  often with an em-dash aside:
  *"Sandboxed code execution MCP server — keep intermediate results out of the context window."*
- **Numbers/specs are concrete:** version badges (`v0.4.2`), read-times (`5 min read`),
  star counts (`⭐22`), keyword pills (`mcp`, `sandbox`, `execution`).
- **Emoji:** the *content spec* uses a single emoji as a project-card icon (📦 🤖 🧠 ⚙️).
  In **Phosphor we retire decorative emoji** in favor of language/brand glyphs and mono
  monograms — cleaner and on-brand. (If a surface needs the playful emoji, keep it to the
  one project-icon slot, never in headings or running copy.)
- **CTAs** are imperative and short: *"Explore Plugins," "Get in Touch," "Browse Plugins →,"
  "All posts →," "Source →," "View on GitHub →," "Track issue →."* Arrows (`→`) signal links.

**Do:** "Battle-tested plugins that make your AI coding agent smarter. Install the
marketplace in one command."
**Don't:** "Unlock the power of next-generation AI synergy solutions." (no marketing fog)

---

## 4. Visual foundations

The mental model is a **high-end terminal / code editor**, not a SaaS landing page.

### Color & vibe
- **Two themes, dark-first.** Dark = *cyan on carbon* (near-black `#0a0c0d`, cool
  off-white ink). Light = *cool porcelain + slate* (`#eceff3` canvas, near-black `#0f161d`).
  The dark theme is the one designed first and shown by default.
- **One signature color: cyan-teal** — `#45e1ed` on dark, deepened to `#15808a`
  on light for contrast. It is used **sparingly** — the prompt `$`, the online dot,
  one primary button, link hovers, the focus ring, a category badge. Never a gradient,
  never a wash. Restraint is the point.
- **No multi-stop gradients, no glow blobs, no grain, no purple.** These were the tells
  of the old site and are banned here. Backgrounds are flat solids; depth comes from
  hairline borders and surface steps (`--surface-1/2/3`), not blur or glow.
- **Imagery vibe** (when used): screenshots/diagrams sit in a bordered "viewport" frame
  with a faux title bar; treat them cool and high-contrast, never warm/soft. Prefer
  real terminal/editor captures over stock photography.

### Type
- **Two families only.** `IBM Plex Mono` (display, wordmark, labels, code, chrome) +
  `Hanken Grotesk` (body, long-form). Mono-forward is the identity — headings are *mono*.
- Big mono headings run **tight** (`-0.04em`); body runs comfortable (`1.62` leading).
- The recurring motif is the **wide-tracked UPPERCASE mono micro-label** (`.label`,
  `0.18em` tracking) used as eyebrows and badges.

### Layout & space
- 4px spacing base; generous section rhythm (`96–128px` vertical between sections).
- Max content width ~`1080–1120px`, centered. Cards in responsive `auto-fill` grids
  (`minmax(300–320px, 1fr)`) with `gap`, never inline flow.
- **Structural hairlines.** Many sections are framed by 1px rules; lists use
  top/bottom hairlines rather than boxes. A faint background **grid** (graph-paper
  lines at very low opacity) may underlay the hero — optional, terminal-blueprint feel.
- Sticky nav is a thin (56–60px) bar with a hairline bottom border and backdrop blur.

### Borders, radii, elevation
- **Sharp radii:** `3 / 5 / 8 / 12px`. Pills for filter chips only.
- Cards: flat `--surface-1` fill, `1px solid --line` border, small radius (`8–12px`),
  **no shadow at rest in dark** (borders carry it); light mode gets a whisper `--shadow-sm`.
- **Shadows are restrained** and neutral-black, never colored. Dark mode leans on
  borders + surface steps for separation; light mode adds soft shadows on hover.

### Motion
- **Crisp and minimal.** `120–200ms`, `cubic-bezier(0.22,1,0.36,1)`. Eased fade-up
  reveals on scroll (≤`20px` travel). **No bounces, no parallax, no float loops.**
- **Two signature terminal touches, used once or twice:** a **blinking block cursor**
  on the hero wordmark and a **pulsing "online" status dot** in the chip. That's the
  entire animation budget — everything else is static or a quiet hover.

### Interaction states
- **Hover.** Borders go from `--line` → `--line-strong`; text muted → `--fg-1`;
  the accent button darkens (`--accent` → `--accent-press`); cards lift `1px` (light)
  or simply brighten their border (dark). Links: underline or accent color, no glow.
- **Press.** Slight `translateY(1px)` + the `--accent-press` token; quick (`120ms`).
- **Focus.** A `2px` accent outline / ring (`--accent`), offset `2px`. Always visible —
  this is a keyboard-driven, developer audience.
- **Selected/active.** Solid `--accent` fill with `--accent-ink` text (pills, tabs).

### Transparency & blur
- Used **only** for the sticky nav (`backdrop-filter: blur(20px)` over a translucent
  `--bg`). Everything else is opaque. No frosted cards, no glassmorphism.

---

## 5. Iconography

Phosphor uses a **two-tier** icon strategy and **never hand-draws or AI-generates icons**.

1. **UI / line icons → [Lucide](https://lucide.dev) via CDN.** Lucide's 1.5–2px stroke,
   rounded-join, 24px-grid style matches the crisp terminal aesthetic. Use for
   functional chrome: copy, terminal, arrow-right, sun/moon (theme toggle), chevrons,
   external-link, search, hash, sparkles, package, book-open, folder-git, sprout
   (nursery "incubating"). Load:
   `<script src="https://unpkg.com/lucide@latest"></script>` then `lucide.createIcons()`,
   or inline `<i data-lucide="terminal"></i>`. Stroke inherits `currentColor`.
2. **Brand / social glyphs → [simple-icons](https://simpleicons.org), copied into
   `assets/brand-icons/`.** Real single-path brand marks for GitHub, X, Substack,
   Medium, Discord, Anthropic, Claude, plus language marks (TypeScript, Python,
   JavaScript) for project/tech labels. Single-color — set `fill: currentColor` (or a
   muted token) so they tint with the theme.

**Emoji & unicode.** Decorative emoji are **retired** from Phosphor (the old content spec
used 📦🤖🧠 as project icons). Replacements: language/brand glyphs, a mono monogram tile
(e.g. a `JB` or first-letter chip), or a Lucide icon. **Unicode is used purposefully**
as typographic furniture, not decoration: the prompt `$`, the link arrow `→`, the
em-dash `—`, the bullet `·`, and the block caret `▋`. No emoji in headings or running copy.

**Logo / wordmark.** There is **no raster logo** in the source — the brand mark is the
**typographic wordmark `joeblack.nyc`** (lowercase, IBM Plex Mono, the `.nyc` in accent
or `--fg-3`) and a square **`JB` monogram tile** (mono, on `--surface-2` or a solid
accent). Both are CSS/text treatments, defined in `assets/` and the UI kit — not image files.

---

## 6. Index — what's in this system

| Path | What it is |
|---|---|
| `README.md` | This file — context, content + visual foundations, iconography, manifest. |
| `colors_and_type.css` | **Foundations.** All color + type tokens (CSS custom properties), both themes, semantic type roles. Import this first. |
| `SKILL.md` | Agent-Skill manifest so this system can be dropped into Claude Code / Codex. |
| `assets/brand-icons/` | Real brand/social SVG glyphs (GitHub, X, Substack, Medium, Discord, Anthropic, Claude, language marks). |
| `preview/` | The Design System tab cards — small HTML specimens of color, type, spacing, components, brand. |
| `ui_kits/website/` | **The hub UI kit** — hi-fi, interactive recreation of `ai.joeblack.nyc` in the Phosphor system. `index.html` + factored JSX components + its own README. |

### Fonts
Loaded from **Google Fonts CDN** (`IBM Plex Mono`, `Hanken Grotesk`) via `@import` in
`colors_and_type.css` — reliable in-browser. For a fully **offline** build, drop the
`woff2` files into `fonts/` and swap the `@import` for `@font-face`. *(See caveat below.)*

---

## Caveats / open questions
- **Fonts are referenced via Google Fonts CDN, not vendored** into `fonts/` (binary font
  files couldn't be fetched in this environment). Both are free, open-licensed
  (OFL / Apache-2.0). If you want true offline assets, hand me the `woff2` files or say
  the word and I'll wire up `@font-face` once they're added.
- **No raster logo exists** in the source, so the brand mark is purely typographic. If
  you have an actual logo/avatar, share it and I'll integrate it.
- The whole visual direction (Phosphor: terminal, dark-first, cyan-teal accent) was my
  call after the direction questions timed out, then refined with you — the accent was
  chosen from an 80-option in-context exploration (option #42).
