---
name: agent-marketplace-design-system
description: Use this skill to generate well-branded interfaces and assets for Agent Marketplace / joeblack.nyc (Joe Black's AI-tools hub), either for production or throwaway prototypes/mocks. Contains the Phosphor design system — a terminal-grade, dark-first, phosphor-green aesthetic — with colors, type, fonts, brand assets, and a full website UI kit for prototyping.
user-invocable: true
---

# Phosphor — Agent Marketplace / joeblack.nyc

Read `README.md` in this skill first — it carries the full product context, content
fundamentals (voice/tone), visual foundations, and iconography rules. Then explore the
other files as needed.

## What's here
- `README.md` — the canonical guide (context, content + visual foundations, iconography, index).
- `colors_and_type.css` — all color + type tokens (both themes) and semantic type roles. Import first.
- `assets/brand-icons/` — real brand/social SVG glyphs (GitHub, X, Substack, Medium, Discord, Anthropic, Claude, language marks).
- `preview/` — small HTML specimens of the system (colors, type, spacing, components, brand).
- `ui_kits/website/` — a hi-fi, interactive recreation of the joeblack.nyc hub. Reusable JSX components + `index.html`.

## How to use it
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets/CSS you need
  out into static HTML files the user can open. Start from the tokens in
  `colors_and_type.css` and lift components from `ui_kits/website/`.
- **Production code**: read the rules here and reuse the tokens to become an expert in
  designing with this brand.

## The system in one breath
Terminal-grade, **dark-first** (cool-carbon `#0a0c0d` + off-white ink), one signature
**cyan-teal** accent (`#45e1ed` dark / `#1ba7b1` light) used sparingly, **mono-forward**
type (IBM Plex Mono display/labels/code + Hanken Grotesk body), sharp small radii, hairline
borders over glow, crisp minimal motion. **No purple, no multi-stop gradients, no grain, no
glow blobs, no decorative emoji** — that's the old look this system replaces.

## If invoked with no other guidance
Ask the user what they want to build or design, ask a few focused questions (surface,
audience, dark/light, how many variations), then act as an expert designer — output HTML
artifacts or production code depending on the need.
