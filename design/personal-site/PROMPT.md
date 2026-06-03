# Site Generation Prompt

Use this prompt when regenerating or rebuilding the site from scratch with an AI design/code tool.

---

Build a single-page personal developer hub for Joe Black at joeblack.nyc.

**Content and structure:** follow `CONTENT.md` exactly — section order, headings, copy, and all plugin/project data must match.

**Visual design:** follow `DESIGN.md` exactly — apply the Phosphor design system. Do not invent colors, fonts, or spacing. Key constraints:

- Fonts: IBM Plex Mono (display, labels, mono) + Hanken Grotesk (body). Load from Google Fonts.
- Default theme: dark. `[data-theme="dark"]` on `<html>`, set before CSS renders to prevent flash.
- Accent: single cyan-teal (`#45e1ed` dark / `#15808a` light). No gradients, no secondary accent.
- Background: carbon `#0a0c0d` dark / porcelain `#eceff3` light.
- Hero background: blueprint grid (CSS linear-gradient lines, radial mask at top). No glow, no grain, no parallax.
- No decorative emoji in UI chrome. Emoji in project/nursery card icons is fine.
- Sharp radii: 3/5/8/12px. No 14px+ corner rounding.
- Motion: 120–200ms max. No bounces.

**Plugins section must have:**
- Platform switcher tabs: Claude Code | Codex CLI
- Each tab shows its own install command + filtered plugin grid
- Plugin cards loaded dynamically from `.claude-plugin/marketplace.json` (Claude Code) and `.codex-plugin/marketplace.json` (Codex CLI)
- Cards render category badge, name, description, keywords, per-platform install command with copy button, version, source link

**Tech stack:** vanilla HTML/CSS/JS. Vite build. No framework. CSS custom properties for all tokens. `data-theme` attribute on `<html>` for theming.

**Output:** `site/index.html`, `site/style.css`, `site/main.js`, `site/catalog.js`. Match the existing file structure.

**Private repos must never appear in the marketplace catalogs or on the site.** Only include plugins whose GitHub repos are public. Current private repos to exclude: `personal-agent-skills`. Verify repo visibility before adding any new plugin entry.
