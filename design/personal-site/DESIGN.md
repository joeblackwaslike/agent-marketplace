# Personal Site — Design System (Phosphor)

Visual specification for joeblack.nyc. Applied in `site/style.css`.

---

## Philosophy

**Terminal on carbon.** A developer-grade aesthetic that reads like a well-configured terminal: dark-first, monospaced display type, one signature accent, flat surfaces with hairline borders. The deliberate opposite of the previous indigo/violet/gradient approach.

Rules:
- No multi-stop gradients, glow blobs, grain texture, or parallax
- No decorative emoji in UI chrome (content emoji in project cards is fine)
- One accent color, used sparingly — never two at once
- Depth from borders and surface steps, not shadows or blur
- Crisp motion: 120–200ms eases, no bounces

---

## Color system

Architecture: `:root` holds the **light** theme (bulletproof default). `[data-theme="dark"]` overrides to dark. Light mode can never accidentally inherit a dark value.

Default theme: **dark**.

### Dark theme — "phosphor on carbon"

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#0a0c0d` | Page canvas |
| `--surface-1` | `#111519` | Raised cards |
| `--surface-2` | `#161b20` | Sunken wells, code blocks |
| `--surface-3` | `#1d242a` | Deep insets |
| `--fg-1` | `#e6ecf0` | Headlines, primary text |
| `--fg-2` | `#a6b1ba` | Body, secondary |
| `--fg-3` | `#74808a` | Muted, meta, captions |
| `--fg-4` | `#4b555e` | Faint, disabled |
| `--line` | `#222a30` | Default hairline border |
| `--line-strong` | `#36424a` | Emphasized / hover border |
| `--accent` | `#45e1ed` | Primary accent (bright cyan-teal) |
| `--accent-press` | `#37b4be` | Pressed/active state |
| `--accent-soft` | `rgba(69,225,237,0.12)` | Tint fill |
| `--accent-line` | `rgba(69,225,237,0.30)` | Tinted border |
| `--accent-ink` | `#04171b` | Text on solid accent fill |
| `--signal` | `#45e1ed` | "Online" status dot |
| `--cursor` | `#45e1ed` | Blinking terminal caret |

### Light theme — "cool porcelain + slate"

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#eceff3` | Page canvas |
| `--surface-1` | `#f8fafc` | Raised cards |
| `--surface-2` | `#dfe5ec` | Sunken wells |
| `--fg-1` | `#0f161d` | Headlines |
| `--fg-2` | `#3c4753` | Body |
| `--fg-3` | `#5b6772` | Muted |
| `--line` | `#d8dee6` | Hairline |
| `--line-strong` | `#c2ccd6` | Emphasized border |
| `--accent` | `#15808a` | Deepened teal (AA on light) |
| `--accent-press` | `#0f626a` | Pressed state |

---

## Typography

| Token | Value |
|-------|-------|
| `--font-display` | `'IBM Plex Mono'` (display, wordmark, labels, code, UI chrome) |
| `--font-body` | `'Hanken Grotesk'` (body copy, long-form reading) |

Loaded via Google Fonts:
```
IBM Plex Mono: ital,wght@0,400;0,500;0,600;0,700;1,400;1,500
Hanken Grotesk: wght@400;500;600;700;800
```

### Type scale (fluid)

| Token | Value | Role |
|-------|-------|------|
| `--t-display` | `clamp(3.2rem, 8vw, 6rem)` | Hero wordmark |
| `--t-h1` | `clamp(2.4rem, 5vw, 3.6rem)` | Page title |
| `--t-h2` | `clamp(1.7rem, 3.4vw, 2.5rem)` | Section heading |
| `--t-h3` | `1.3rem` | Card title |
| `--t-body` | `1.0625rem` (17px) | Body |
| `--t-label` | `0.75rem` | Mono labels / chips |
| `--t-micro` | `0.6875rem` | 11px micro-label |

Display type uses IBM Plex Mono. Body copy uses Hanken Grotesk.

Section labels (`--t-label`) are UPPERCASE, letter-spacing `0.18em`, color `--accent` — the signature terminal-label treatment.

---

## Spacing & radii

Spacing base: 4px (`--s-1` through `--s-10`: 4px → 128px).

| Token | Value | Use |
|-------|-------|-----|
| `--r-xs` | `3px` | Badges, copy buttons |
| `--r-sm` | `5px` | Buttons, icon buttons, tabs |
| `--r-md` | `8px` | Project cards, connect cards |
| `--r-lg` | `12px` | Plugin cards |
| `--r-pill` | `100px` | Filter pills, status chips |

Section vertical padding: `104px` top/bottom (`72px` on mobile).

---

## Motion

| Token | Value |
|-------|-------|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--dur-fast` | `0.12s` |
| `--dur` | `0.2s` |
| `--dur-slow` | `0.4s` |

Scroll reveal: `.reveal` starts at `opacity:0; translateY(16px)`, transitions to `.reveal.in` on viewport entry (IntersectionObserver, threshold 0.08).

No parallax. No bounce easing.

---

## Key components

### Nav

Sticky, 60px height. Translucent background via `color-mix(in srgb, var(--bg) 84%, transparent)` + `backdrop-filter: blur(20px)`. Bottom hairline `1px solid var(--line)`.

Wordmark: IBM Plex Mono semi, `.nyc` span colored `--accent`.

Icon buttons (GitHub, X, theme toggle): 34×34px, `1px solid var(--line-strong)`, `--r-sm`. Ghost style — no fill, border on hover shifts to `--fg-3`.

### Hero

Blueprint grid background: two perpendicular `linear-gradient` lines at `56px` tile, masked radially (ellipse 90% 70% at top-center → fade to transparent). `opacity: 0.5`. Contains the section within `overflow: hidden`.

No glow blobs. No grain overlay. No parallax scroll.

Online chip: pill border, `--r-pill`, mono 12px, pulsing `--signal` dot (2.4s ease-in-out).

Heading: `--t-display`, IBM Plex Mono bold, line-height 0.98. Second line (`Black.`) colored `--accent`.

### Section labels (eyebrow)

```
—— LABEL TEXT
```

Pseudo-element `::before` draws a 22px horizontal line in `--accent-line` before the label text. Label itself: IBM Plex Mono, uppercase, 0.18em tracking, `--accent`.

### Platform tabs

Segmented control: `--surface-2` background, `1px solid var(--line)`, `--r-md`. Active tab fills `--accent` with `--accent-ink` text. Inactive tabs: `--fg-3`, hover `--fg-1`.

### Install snippet

Terminal-style block: `--surface-2` bg, `1px solid var(--line)`, `--r-md`. Prompt symbol `$` in `--accent`. Code in IBM Plex Mono 13px. Copy button: mono 11px, `--r-xs` border, hover accent.

### Plugin cards

`--surface-1` bg, `1px solid var(--line)`, `--r-lg`. On hover: border shifts to `--line-strong`, `translateY(-2px)`, `--shadow-md`. Accent top-bar animates in via `::before { scaleX(0 → 1) }` on hover.

Category badges: UPPERCASE mono, category-specific tint colors (accent for productivity, blue for execution, amber for memory/security, purple for testing, etc.).

### Project cards

`--surface-1`, `1px solid var(--line)`, `--r-md`. Icon: 34×34 box in `--surface-2` with accent mono letter/emoji. Nursery cards: `border-style: dashed`.

### Writing rows

Horizontal list with bottom hairlines. Hover: `padding-left` animates from 0 → 10px. Tag: mono uppercase cyan. Title: mono medium, hover accent.

### Buttons

IBM Plex Mono 14px, `--r-sm`, 12×22px padding.

- **Primary**: `--accent` fill, `--accent-ink` text, hover `--accent-press`
- **Ghost**: transparent, `1px solid --line-strong`, hover `--surface-2` fill

### Footer

Mono 12px, `--fg-3`. Top hairline. Flex row with `·` separators in `--line-strong`. Wordmark: `--fg-1` semi, `.nyc` in `--accent`.

---

## Responsive breakpoints

- **760px**: nav links hidden, single-column grids, reduced section padding (72px), hero padding (80px/72px)
- **480px**: connect grid 1-col, hero CTAs stack vertically

---

## What was removed from the previous design

| Removed | Reason |
|---------|--------|
| Grain noise overlay (`body::before`) | Phosphor is clean, no texture |
| Glow blobs (`--glow-hero-*`, `--glow-card`) | Depth via borders only |
| Multi-stop gradient (`--grad`) | Single accent only |
| Gradient text (`.grad-text`) | Accent color instead |
| Parallax hero scroll | Crisp motion only |
| `Syne` / `Space Grotesk` / `JetBrains Mono` fonts | Replaced by IBM Plex Mono + Hanken Grotesk |
| Indigo/violet/pink palette | Replaced by cyan-teal single accent |
| JB avatar monogram in hero | Not in Phosphor |
| Scroll hint indicator | Not in Phosphor |
