# UI Kit — joeblack.nyc (the hub)

A hi-fi, interactive recreation of the **Agent Marketplace / joeblack.nyc** single-page
hub, built in the **Phosphor** design system. This is the one product surface — a
personal hub with five sections: Hero, Plugins, Writing, Projects (+ Nursery), Connect.

> ⚠️ Phosphor is a **new** direction. The current public site
> (`joeblackwaslike.github.io/agent-marketplace`) uses an indigo-gradient look Joe
> dislikes; this kit deliberately replaces it. The **content & IA** are faithful to
> `design/personal-site/CONTENT.md` and the repo README — the **visuals** are new.

## Run it
Open `index.html`. It's self-contained: tokens (`colors_and_type.css`), component
styles (`site.css`), content (`data.js`), and React/Babel components. Brand glyphs live
in `assets/brand-icons/` (copied from the root system).

## What's interactive
- **Theme toggle** — dark ⇄ light, persisted to `localStorage` (`jb-theme`). Dark is default.
- **Platform tabs** — Claude Code ⇄ Codex CLI; rewrites every install command live.
- **Filter pills** — filter the plugin grid by category (All / productivity / execution / memory).
- **Copy buttons** — copy any install command to clipboard with a confirm state.
- **Scroll reveals** — sections fade up on entry (IntersectionObserver).
- Hover/press/focus states throughout; sticky blurred nav.

## Files
| File | Role |
|---|---|
| `index.html` | Mounts `<App/>`: Nav → Hero → Plugins → Writing → Projects → Connect → Footer. |
| `colors_and_type.css` | Design tokens (copied from root — keep in sync). |
| `site.css` | All component styles, dark-first with light overrides. |
| `data.js` | `window.DATA` — plugins, writing, projects, nursery, connect content. |
| `ui.jsx` | Primitives: `Brand` (SVG glyph), `CopyButton`, `Snippet`, `Eyebrow`, `Reveal`, Lucide icons. |
| `Nav.jsx` | `Nav` (sticky bar + theme toggle) and `Hero` (monogram, status chip, caret, CTAs). |
| `Plugins.jsx` | `Plugins` section + `PluginCard` (badge, keywords, install snippet, source link). |
| `Sections.jsx` | `Writing`, `Projects` (+ Nursery), `Connect`, `Footer`. |

## Component coverage
Sticky nav · wordmark + JB monogram · status chip · hero CTAs · primary/ghost buttons ·
platform tab switch · install snippet w/ copy · filter pills · plugin card · writing list
rows · project cards (with language glyphs) · nursery cards (incubating) · connect/social
cards · footer. These are modular and reusable — compose them for new pages.

## Notes
- Components share scope via `window` assignment (each `text/babel` script is isolated).
- Reuses real brand glyphs (simple-icons) and Lucide line icons — no hand-drawn SVG.
- To add a plugin/project/post, edit `data.js` — no component changes needed.
