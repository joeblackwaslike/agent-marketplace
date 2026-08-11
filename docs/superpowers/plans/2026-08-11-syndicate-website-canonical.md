# Syndicate — Website as Canonical Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `joeblack.nyc` host full article pages (canonical), publish there first, and have every
other platform (Substack, dev.to, Medium, X, LinkedIn, Facebook) point back to it instead of Substack.

**Architecture:** `website-publisher.ts` grows from "insert a homepage card" to "render a full article
page + insert a card that links to it." `diff.ts`'s sequencing gate flips from Substack-first to
website-first. `sync-article.ts` reads the canonical URL from `syndication.website.url` instead of
`syndication.substack.url`. `site/vite.config.js` picks up generated article pages as real build
entries via a directory glob, so they get the same asset pipeline as the homepage.

**Tech Stack:** TypeScript/Node (syndicate), `marked` (new dependency, markdown→HTML), Vite multi-page
build (site).

**Spec:** `docs/superpowers/specs/2026-08-11-syndicate-website-canonical-design.md` — read it first for
the *why*; this plan is the *how*. Two refinements below go slightly beyond what the spec states
explicitly, each with its own rationale inline: (1) the website-sync step now supplies its own
AI-drafted tag (previously this fell out naturally when website ran alongside the caption platforms;
under the new website-first gate it no longer would, without this change), and (2) `publishedAt` gets
set at the website step instead of the Substack step, since the website is now the true first-publish
event.

---

### Task 1: Config — `SITE_BASE_URL` + `marked` dependency

**Files:**
- Modify: `nursery/syndicate/src/config.ts`
- Test: `nursery/syndicate/tests/config.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a `SITE_BASE_URL` case to the "parses a valid env" test and a new missing-field test, in
`nursery/syndicate/tests/config.test.ts`:

```typescript
describe('loadConfig', () => {
  it('parses a valid env', () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'sk-ant-test',
      DEVTO_API_KEY: 'devto-test',
      SUBSTACK_SUBDOMAIN: 'joeblackwaslike',
      SITE_BASE_URL: 'https://joeblack.nyc',
    });
    expect(config.ARTICLES_DIR).toBe('private-content/drafts/articles');
    expect(config.SITE_INDEX_PATH).toBe('site/index.html');
  });

  it('throws when ANTHROPIC_API_KEY is missing', () => {
    expect(() =>
      loadConfig({
        DEVTO_API_KEY: 'devto-test',
        SUBSTACK_SUBDOMAIN: 'joeblackwaslike',
        SITE_BASE_URL: 'https://joeblack.nyc',
      }),
    ).toThrow();
  });

  it('throws when SUBSTACK_SUBDOMAIN is missing', () => {
    expect(() =>
      loadConfig({
        ANTHROPIC_API_KEY: 'sk-ant-test',
        DEVTO_API_KEY: 'devto-test',
        SITE_BASE_URL: 'https://joeblack.nyc',
      }),
    ).toThrow();
  });

  it('throws when SITE_BASE_URL is missing', () => {
    expect(() =>
      loadConfig({
        ANTHROPIC_API_KEY: 'sk-ant-test',
        DEVTO_API_KEY: 'devto-test',
        SUBSTACK_SUBDOMAIN: 'joeblackwaslike',
      }),
    ).toThrow();
  });

  it('throws when SITE_BASE_URL is not a valid URL', () => {
    expect(() =>
      loadConfig({
        ANTHROPIC_API_KEY: 'sk-ant-test',
        DEVTO_API_KEY: 'devto-test',
        SUBSTACK_SUBDOMAIN: 'joeblackwaslike',
        SITE_BASE_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `cd nursery/syndicate && pnpm vitest run tests/config.test.ts --pool=forks`
Expected: the two new tests FAIL — `SITE_BASE_URL` isn't in the schema yet, so the "missing" case
doesn't throw, and the "valid env" test doesn't need it yet either way (it'll still pass at this
point, since it doesn't require the field) — the two NEW `SITE_BASE_URL` tests are what must fail.

- [ ] **Step 3: Add `SITE_BASE_URL` to the schema**

In `nursery/syndicate/src/config.ts`, update `envSchema`:

```typescript
const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DEVTO_API_KEY: z.string().min(1),
  SUBSTACK_SUBDOMAIN: z.string().min(1),
  SITE_BASE_URL: z.string().url(),
  ARTICLES_DIR: z.string().default('private-content/drafts/articles'),
  SITE_INDEX_PATH: z.string().default('site/index.html'),
});
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm vitest run tests/config.test.ts --pool=forks`
Expected: PASS (7 tests)

- [ ] **Step 5: Add the `marked` dependency**

Run: `cd nursery/syndicate && pnpm add marked`

- [ ] **Step 6: Add `SITE_BASE_URL` to the local `.env`**

Edit `nursery/syndicate/.env` (gitignored, not committed) and add:

```
SITE_BASE_URL=https://joeblack.nyc
```

- [ ] **Step 7: Commit**

```bash
cd /Users/joe/github/joeblackwaslike/agent-marketplace
git add nursery/syndicate/src/config.ts nursery/syndicate/tests/config.test.ts nursery/syndicate/package.json nursery/syndicate/pnpm-lock.yaml
git commit -m "feat(syndicate): add SITE_BASE_URL config, marked dependency"
```

---

### Task 2: `website-status.ts` — file-existence live check

**Files:**
- Modify: `nursery/syndicate/src/website-status.ts`
- Test: `nursery/syndicate/tests/website-status.test.ts`

The live check changes from scanning `site/index.html` for a matching `href` to checking whether
`site/writing/{slug}/index.html` exists on disk — simpler, and correctly reflects the new definition
of "on the website" (has a real page), not just "has a homepage link."

- [ ] **Step 1: Write the failing test**

Replace the full contents of `nursery/syndicate/tests/website-status.test.ts`:

```typescript
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { isArticleOnWebsite } from '../src/website-status.js';

describe('isArticleOnWebsite', () => {
  let siteIndexPath: string;
  let siteDir: string;

  beforeEach(async () => {
    siteDir = await mkdtemp(join(tmpdir(), 'syndicate-site-'));
    siteIndexPath = join(siteDir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
  });

  it('returns true when the article page exists on disk', async () => {
    await mkdir(join(siteDir, 'writing', 'my-slug'), { recursive: true });
    await writeFile(join(siteDir, 'writing', 'my-slug', 'index.html'), '<html></html>', 'utf8');

    expect(await isArticleOnWebsite(siteIndexPath, 'my-slug')).toBe(true);
  });

  it('returns false when the article page does not exist', async () => {
    expect(await isArticleOnWebsite(siteIndexPath, 'missing-slug')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `cd nursery/syndicate && pnpm vitest run tests/website-status.test.ts --pool=forks`
Expected: FAIL — `isArticleOnWebsite` still takes an article URL and scans HTML, not a slug.

- [ ] **Step 3: Rewrite `website-status.ts`**

Replace the full contents of `nursery/syndicate/src/website-status.ts`:

```typescript
import { access } from 'node:fs/promises';
import path from 'node:path';

export async function isArticleOnWebsite(siteIndexPath: string, slug: string): Promise<boolean> {
  const pagePath = path.join(path.dirname(siteIndexPath), 'writing', slug, 'index.html');
  try {
    await access(pagePath);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `pnpm vitest run tests/website-status.test.ts --pool=forks`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/website-status.ts nursery/syndicate/tests/website-status.test.ts
git commit -m "fix(syndicate): derive website-live status from the article page file, not a URL scan"
```

---

### Task 3: `diff.ts` — website-first gate

**Files:**
- Modify: `nursery/syndicate/src/diff.ts`
- Test: `nursery/syndicate/tests/diff.test.ts`

- [ ] **Step 1: Read the current test file, then replace it**

Replace the full contents of `nursery/syndicate/tests/diff.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { computeGaps } from '../src/diff.js';
import type { Article } from '../src/types.js';

function makeArticle(overrides: Partial<Article['frontmatter']['syndication']> = {}): Article {
  return {
    filePath: '/tmp/article.md',
    content: 'body',
    frontmatter: {
      title: 'T',
      slug: 't',
      status: 'ready',
      tags: [],
      description: '',
      publishedAt: null,
      syndication: {
        substack: { status: 'pending', url: null },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'pending' },
        facebook: { status: 'pending' },
        ...overrides,
      },
    },
  };
}

describe('computeGaps', () => {
  it('returns only website when the website is not yet live, regardless of other statuses', () => {
    const article = makeArticle({ substack: { status: 'synced', url: 'https://sub.example.com/p/x' } });

    const gaps = computeGaps(article, { website: false, devtoUrl: null });

    expect(gaps).toEqual(['website']);
  });

  it('returns downstream gaps once the website is live', () => {
    const article = makeArticle();

    const gaps = computeGaps(article, { website: true, devtoUrl: null });

    expect(gaps).toEqual(['substack', 'medium', 'devto', 'x', 'linkedin', 'facebook']);
  });

  it('excludes platforms already synced or live', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
      medium: { status: 'synced', url: null },
      x: { status: 'synced', url: null },
    });

    const gaps = computeGaps(article, {
      website: true,
      devtoUrl: 'https://dev.to/joe/x',
    });

    expect(gaps).toEqual(['linkedin', 'facebook']);
  });

  it('returns an empty array when everything is synced or live', () => {
    const article = makeArticle({
      substack: { status: 'synced', url: 'https://sub.example.com/p/x' },
      medium: { status: 'synced', url: null },
      x: { status: 'synced', url: null },
      linkedin: { status: 'synced', url: null },
      facebook: { status: 'synced', url: null },
    });

    const gaps = computeGaps(article, {
      website: true,
      devtoUrl: 'https://dev.to/joe/x',
    });

    expect(gaps).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm vitest run tests/diff.test.ts --pool=forks`
Expected: FAIL — `computeGaps` still gates on `substack.status`, not `live.website`.

- [ ] **Step 3: Rewrite `diff.ts`**

Replace the full contents of `nursery/syndicate/src/diff.ts`:

```typescript
import type { Article, PlatformKey } from './types.js';

export type LiveStatus = {
  website: boolean;
  devtoUrl: string | null;
};

const DOWNSTREAM_ORDER: PlatformKey[] = ['substack', 'medium', 'devto', 'x', 'linkedin', 'facebook'];

function isPlatformLive(
  platform: PlatformKey,
  syndication: Article['frontmatter']['syndication'],
  live: LiveStatus,
): boolean {
  if (platform === 'devto') return live.devtoUrl !== null;
  return syndication[platform].status === 'synced';
}

export function computeGaps(article: Article, live: LiveStatus): PlatformKey[] {
  const { syndication } = article.frontmatter;

  if (!live.website) {
    return ['website'];
  }

  return DOWNSTREAM_ORDER.filter((platform) => !isPlatformLive(platform, syndication, live));
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `pnpm vitest run tests/diff.test.ts --pool=forks`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/diff.ts nursery/syndicate/tests/diff.test.ts
git commit -m "feat(syndicate): flip sync gate from substack-first to website-first"
```

---

### Task 4: Extract shared `site/theme.js`

**Files:**
- Create: `site/theme.js`
- Modify: `site/main.js`

Small DRY prep so the generated article-page template (Task 6) can reuse the exact same theme-toggle
logic instead of duplicating it. No test file — `main.js` itself has no direct unit tests today
(`site/tests/catalog.test.js` only covers `catalog.js`); this is verified by the real `vite build`
smoke test in Task 10.

- [ ] **Step 1: Create `site/theme.js`**

```javascript
export function getStoredTheme() {
  return localStorage.getItem('jb-theme');
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('jb-theme', theme);
  // Icon visibility handled by CSS [data-theme="dark"] rules.
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

export function initTheme() {
  const saved = getStoredTheme();
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(saved || preferred);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}
```

- [ ] **Step 2: Update `site/main.js` to import it**

In `site/main.js`, replace the three function definitions under the `// ── Theme ──` comment
(`getStoredTheme`, `applyTheme`, `initTheme`) with an import, leaving every call site (`initTheme()`
inside `init()`) unchanged:

```javascript
import {
  getCategories, applyFilter, renderPluginCard, renderFilterPills,
  renderProjectCard, renderDomainPills, projectMatches,
} from './catalog.js';
import { PROJECTS, allDomains } from './projects.js';
import { initTheme } from './theme.js';
```

Delete the old `// ── Theme ──` block (the `getStoredTheme`, `applyTheme`, `initTheme` function
bodies) entirely — `initTheme` is now imported, not defined locally.

- [ ] **Step 3: Verify no other file references the deleted functions**

Run: `grep -rn "getStoredTheme\|applyTheme" site/*.js`
Expected: only `site/theme.js` itself.

- [ ] **Step 4: Commit**

```bash
git add site/theme.js site/main.js
git commit -m "refactor(site): extract theme toggle into a shared module"
```

---

### Task 5: Article-page CSS

**Files:**
- Modify: `site/style.css`

- [ ] **Step 1: Append the article-page styles**

Add to the end of `site/style.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════
   ARTICLE PAGE
   ═══════════════════════════════════════════════════════════════════════ */
.article-page {
  padding: var(--s-9) 0 var(--s-8);
}
.article-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 32px;
}
.article-back {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--t-small);
  color: var(--fg-3);
  margin-bottom: var(--s-6);
}
.article-back:hover { color: var(--accent); }
.article-title {
  font-family: var(--font-display);
  font-weight: var(--w-semi);
  font-size: var(--t-h1);
  line-height: var(--lh-tight);
  letter-spacing: var(--track-tight);
  margin-top: var(--s-3);
  margin-bottom: var(--s-4);
}
.article-meta {
  font-family: var(--font-mono);
  font-size: var(--t-small);
  color: var(--fg-3);
  margin-bottom: var(--s-7);
}
.article-body {
  font-family: var(--font-body);
  font-size: var(--t-body);
  line-height: var(--lh-body);
  color: var(--fg-2);
}
.article-body h2 {
  font-family: var(--font-display);
  font-weight: var(--w-semi);
  font-size: var(--t-h2);
  line-height: var(--lh-snug);
  color: var(--fg-1);
  margin-top: var(--s-8);
  margin-bottom: var(--s-4);
}
.article-body h3 {
  font-family: var(--font-display);
  font-weight: var(--w-semi);
  font-size: var(--t-h3);
  color: var(--fg-1);
  margin-top: var(--s-7);
  margin-bottom: var(--s-3);
}
.article-body p { margin-bottom: var(--s-5); }
.article-body a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.article-body a:hover { color: var(--accent-press); }
.article-body ul, .article-body ol { margin: 0 0 var(--s-5) var(--s-5); }
.article-body li { margin-bottom: var(--s-2); }
.article-body blockquote {
  border-left: 3px solid var(--accent-line);
  padding-left: var(--s-4);
  margin: 0 0 var(--s-5);
  color: var(--fg-3);
}
.article-body code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--surface-2);
  padding: 2px 6px;
  border-radius: var(--r-xs);
}
.article-body pre {
  background: var(--surface-1);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--s-4);
  overflow-x: auto;
  margin: 0 0 var(--s-5);
}
.article-body pre code {
  background: none;
  padding: 0;
  font-size: 13px;
  line-height: var(--lh-snug);
}
.article-body hr {
  border: none;
  border-top: 1px solid var(--line);
  margin: var(--s-7) 0;
}
.article-body img {
  max-width: 100%;
  border-radius: var(--r-md);
  margin: var(--s-5) 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add site/style.css
git commit -m "style(site): add article-page typography"
```

---

### Task 6: `website-publisher.ts` — render article pages, dedupe cards

**Files:**
- Modify: `nursery/syndicate/src/website-publisher.ts`
- Test: `nursery/syndicate/tests/website-publisher.test.ts`

Two changes: `insertWritingCard` gains a `slug` field and replaces an existing card for that slug
instead of always appending (needed because the one already-published article will re-run through
`syncWebsite` once — see Task 8 — and must not end up with two homepage cards). A new
`renderArticlePage` function produces the full page HTML.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `nursery/syndicate/tests/website-publisher.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { insertWritingCard, renderArticlePage } from '../src/website-publisher.js';
import type { Article } from '../src/types.js';

const BASE_HTML = `<section><div class="writing-list"><article>existing</article></div></section>`;

describe('insertWritingCard', () => {
  it('inserts a new card right after the writing-list marker', () => {
    const result = insertWritingCard(BASE_HTML, {
      slug: 'new-post',
      tag: 'AI Agents',
      title: 'New Post',
      url: '/writing/new-post/',
      readTime: 5,
    });

    expect(result).toContain('<span class="writing-tag">AI Agents</span>');
    expect(result).toContain('href="/writing/new-post/"');
    expect(result).toContain('5 min read');
    expect(result.indexOf('New Post')).toBeLessThan(result.indexOf('existing'));
  });

  it('HTML-escapes title and tag', () => {
    const result = insertWritingCard(BASE_HTML, {
      slug: 'x',
      tag: '<script>',
      title: 'Title with "quotes" & <tags>',
      url: '/writing/x/',
      readTime: 1,
    });

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&lt;tags&gt;');
  });

  it('HTML-escapes quotes and apostrophes, including a quote-injection attempt in url', () => {
    const result = insertWritingCard(BASE_HTML, {
      slug: 'x',
      tag: 'AI Agents',
      title: 'It\'s a "great" post',
      url: '/writing/x/?a="onclick="alert(1)',
      readTime: 1,
    });

    expect(result).toContain('&quot;');
    expect(result).toContain('&#39;');
    expect(result).not.toContain('"onclick="alert(1)');
    expect(result).toContain('href="/writing/x/?a=&quot;onclick=&quot;alert(1)"');
  });

  it('throws when the writing-list marker is missing', () => {
    expect(() =>
      insertWritingCard('<div>no marker</div>', {
        slug: 'y',
        tag: 'x',
        title: 'y',
        url: 'z',
        readTime: 1,
      }),
    ).toThrow(/writing-list/);
  });

  it('replaces an existing card for the same slug instead of inserting a duplicate', () => {
    const withCard = insertWritingCard(BASE_HTML, {
      slug: 'repeat',
      tag: 'AI Agents',
      title: 'Original Title',
      url: '/writing/repeat/',
      readTime: 5,
    });

    const result = insertWritingCard(withCard, {
      slug: 'repeat',
      tag: 'AI Agents',
      title: 'Updated Title',
      url: '/writing/repeat/',
      readTime: 6,
    });

    expect(result).toContain('Updated Title');
    expect(result).not.toContain('Original Title');
    expect(result.match(/data-slug="repeat"/g)).toHaveLength(1);
  });
});

function makeArticle(): Article {
  return {
    filePath: '/tmp/article.md',
    content: '# Heading\n\nA [link](https://example.com) and some *text*.\n',
    frontmatter: {
      title: 'My Article',
      slug: 'my-article',
      status: 'ready',
      tags: ['ai'],
      description: 'A description.',
      publishedAt: '2026-08-11T00:00:00.000Z',
      syndication: {
        substack: { status: 'pending', url: null },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'pending' },
        facebook: { status: 'pending' },
      },
    },
  };
}

describe('renderArticlePage', () => {
  it('renders the article markdown into the page body', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('<h1 class="article-title">My Article</h1>');
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<em>text</em>');
  });

  it('includes a canonical link and OG tags built from frontmatter', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('<link rel="canonical" href="https://joeblack.nyc/writing/my-article/" />');
    expect(html).toContain('<meta property="og:title" content="My Article" />');
    expect(html).toContain('<meta property="og:description" content="A description." />');
  });

  it('HTML-escapes title and description', () => {
    const article = makeArticle();
    article.frontmatter.title = 'Title with <tags> & "quotes"';
    article.frontmatter.description = 'Desc with <tags>';

    const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');

    expect(html).not.toContain('<tags>');
    expect(html).toContain('&lt;tags&gt;');
  });

  it('references the shared stylesheet and theme module with page-relative paths', () => {
    const html = renderArticlePage(makeArticle(), 'https://joeblack.nyc', 'AI Agents');

    expect(html).toContain('href="../../style.css"');
    expect(html).toContain("from '../../theme.js'");
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run tests/website-publisher.test.ts --pool=forks`
Expected: FAIL — `insertWritingCard` doesn't take/require `slug` or dedupe, and `renderArticlePage`
doesn't exist yet.

- [ ] **Step 3: Rewrite `website-publisher.ts`**

Replace the full contents of `nursery/syndicate/src/website-publisher.ts`:

```typescript
import { marked } from 'marked';
import { estimateReadTime } from './read-time.js';
import type { Article } from './types.js';

const SITE_TITLE = 'joeblack.nyc';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type WritingCardEntry = {
  slug: string;
  tag: string;
  title: string;
  url: string;
  readTime: number;
};

function buildCard(entry: WritingCardEntry): string {
  return `<article class="writing-card reveal" data-slug="${escapeHtml(
    entry.slug,
  )}"><span class="writing-tag">${escapeHtml(
    entry.tag,
  )}</span><h3 class="writing-title"><a href="${escapeHtml(entry.url)}">${escapeHtml(
    entry.title,
  )}</a></h3><p class="writing-meta">${entry.readTime} min read</p></article>`;
}

export function insertWritingCard(html: string, entry: WritingCardEntry): string {
  const card = buildCard(entry);
  const existingPattern = new RegExp(
    `<article class="writing-card reveal" data-slug="${escapeRegExp(entry.slug)}">.*?</article>`,
  );

  if (existingPattern.test(html)) {
    return html.replace(existingPattern, card);
  }

  const marker = '<div class="writing-list">';
  const index = html.indexOf(marker);
  if (index === -1) {
    throw new Error('writing-list marker not found in site index');
  }
  const insertAt = index + marker.length;
  return html.slice(0, insertAt) + card + html.slice(insertAt);
}

function renderThemeInitScript(): string {
  return `<script>
      (function () {
        var t = localStorage.getItem('jb-theme') || 'dark';
        document.documentElement.dataset.theme = t;
      })();
    </script>`;
}

function renderNav(): string {
  return `<nav class="nav" aria-label="Main navigation">
      <a class="nav-wordmark" href="/#top">joeblack<span class="nyc">.nyc</span></a>
      <ul class="nav-links">
        <li><a href="/#plugins">Plugins</a></li>
        <li><a href="/#writing">Writing</a></li>
        <li><a href="/#projects">Projects</a></li>
        <li><a href="/#connect">Connect</a></li>
      </ul>
      <div class="nav-actions">
        <a class="nav-icon" href="https://github.com/joeblackwaslike" target="_blank" rel="noopener" aria-label="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a class="nav-icon" href="https://twitter.com/joeblackwaslike" target="_blank" rel="noopener" aria-label="Twitter / X">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
          <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>
    </nav>`;
}

function renderFooter(): string {
  return `<footer class="site-footer">
      <span class="footer-wordmark">joeblack.nyc</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <span>© Joe Black</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <span>New York</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <a href="https://github.com/joeblackwaslike/agent-marketplace/blob/main/LICENSE">MIT</a>
    </footer>`;
}

function formatPublishedLabel(publishedAt: string | null): string {
  if (!publishedAt) return '';
  return new Date(publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function renderArticlePage(article: Article, siteBaseUrl: string, tag: string): string {
  const { title, description, slug, publishedAt } = article.frontmatter;
  const canonicalUrl = `${siteBaseUrl}/writing/${slug}/`;
  const readTime = estimateReadTime(article.content);
  const bodyHtml = marked.parse(article.content, { async: false }) as string;
  const metaLine = [formatPublishedLabel(publishedAt), `${readTime} min read`]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <link rel="canonical" href="${canonicalUrl}" />
    <title>${escapeHtml(title)} · ${SITE_TITLE}</title>

    ${renderThemeInitScript()}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="../../style.css" />
  </head>

  <body>
    ${renderNav()}

    <article class="article-page">
      <div class="article-inner">
        <a class="article-back" href="/#writing">← Writing</a>
        <span class="writing-tag">${escapeHtml(tag)}</span>
        <h1 class="article-title">${escapeHtml(title)}</h1>
        <p class="article-meta">${escapeHtml(metaLine)}</p>
        <div class="article-body">
          ${bodyHtml}
        </div>
      </div>
    </article>

    ${renderFooter()}

    <script type="module">
      import { initTheme } from '../../theme.js';
      initTheme();
    </script>
  </body>
</html>
`;
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm vitest run tests/website-publisher.test.ts --pool=forks`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/website-publisher.ts nursery/syndicate/tests/website-publisher.test.ts
git commit -m "feat(syndicate): render full article pages, dedupe homepage cards by slug"
```

---

### Task 7: `site/vite.config.js` — multi-page build

**Files:**
- Modify: `site/vite.config.js`

- [ ] **Step 1: Rewrite `vite.config.js`**

Replace the full contents of `site/vite.config.js`:

```javascript
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const writingDir = resolve(__dirname, 'writing');

const articleEntries = existsSync(writingDir)
  ? Object.fromEntries(
      readdirSync(writingDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => [`writing-${entry.name}`, resolve(writingDir, entry.name, 'index.html')]),
    )
  : {};

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...articleEntries,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 2: Smoke-test with a fixture page**

```bash
mkdir -p site/writing/test-fixture
cat > site/writing/test-fixture/index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Fixture</title>
    <link rel="stylesheet" href="../../style.css" />
  </head>
  <body>
    <h1>Fixture</h1>
  </body>
</html>
EOF
cd site && npm run build
```

Expected: build succeeds, and `site/dist/writing/test-fixture/index.html` exists with a `<link>` tag
pointing at a hashed asset under `assets/` (not a literal `./style.css` or `../../style.css`).

Run: `grep -o 'assets/[^"]*\.css' site/dist/writing/test-fixture/index.html`
Expected: one hashed CSS filename printed.

- [ ] **Step 3: Remove the fixture**

```bash
cd /Users/joe/github/joeblackwaslike/agent-marketplace
rm -rf site/writing
```

- [ ] **Step 4: Commit**

```bash
git add site/vite.config.js
git commit -m "build(site): glob writing/*/index.html into the Vite build inputs"
```

---

### Task 8: `sync-article.ts` — canonical URL from the website, not Substack

**Files:**
- Modify: `nursery/syndicate/src/sync-article.ts`
- Modify: `nursery/syndicate/src/publishers/publisher.ts`
- Test: `nursery/syndicate/tests/sync-article.test.ts`

- [ ] **Step 1: Add `articleContent` to `PublishInput`**

In `nursery/syndicate/src/publishers/publisher.ts`:

```typescript
export type PublishInput = {
  articleTitle: string;
  articleUrl: string;
  articleContent?: string;
  caption?: string;
};
```

- [ ] **Step 2: Write the failing test**

Replace the full contents of `nursery/syndicate/tests/sync-article.test.ts`:

```typescript
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncArticleDeps } from '../src/sync-article.js';
import { syncArticle } from '../src/sync-article.js';
import type { Article } from '../src/types.js';

function makeArticle(): Article {
  return {
    filePath: '/tmp/article.md',
    content: 'The article body.',
    frontmatter: {
      title: 'New Post',
      slug: 'new-post',
      status: 'ready',
      tags: ['ai'],
      description: 'A description.',
      publishedAt: null,
      syndication: {
        substack: { status: 'pending', url: null },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'synced' },
        facebook: { status: 'synced' },
      },
    },
  };
}

function makeDeps(siteIndexPath: string, overrides: Partial<SyncArticleDeps> = {}): SyncArticleDeps {
  return {
    live: { website: false, devtoUrl: null },
    devtoPostClient: { createArticle: vi.fn(async () => ({ url: 'https://dev.to/joe/new-post' })) },
    draftModel: {
      generate: async () => ({
        x: 'Sharp line.',
        linkedin: 'unused',
        facebook: 'unused',
        website: { tag: 'AI Agents' },
      }),
    },
    editPrompt: async (_label, initial) => initial,
    siteIndexPath,
    siteBaseUrl: 'https://joeblack.nyc',
    persistFrontmatter: vi.fn(async () => {}),
    manualPublishers: {
      substack: { platform: 'substack', publish: vi.fn(async () => ({ status: 'synced' as const })) },
      medium: { platform: 'medium', publish: vi.fn(async () => ({ status: 'synced' as const })) },
      x: { platform: 'x', publish: vi.fn(async () => ({ status: 'synced' as const })) },
      linkedin: { platform: 'linkedin', publish: vi.fn() },
      facebook: { platform: 'facebook', publish: vi.fn() },
    },
    ...overrides,
  };
}

describe('syncArticle', () => {
  let siteIndexPath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'syndicate-sync-'));
    siteIndexPath = join(dir, 'index.html');
    await writeFile(siteIndexPath, '<div class="writing-list"></div>', 'utf8');
  });

  it('syncs only the website when it is not yet live, and records its own URL', async () => {
    const article = makeArticle();
    const deps = makeDeps(siteIndexPath);

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(article.frontmatter.syndication.website).toEqual({
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    });
    expect(article.frontmatter.publishedAt).not.toBeNull();
    expect(article.frontmatter.syndication.substack.status).toBe('pending');
    expect(deps.manualPublishers.substack.publish).not.toHaveBeenCalled();

    const pageHtml = await readFile(
      join(dirname(siteIndexPath), 'writing', 'new-post', 'index.html'),
      'utf8',
    );
    expect(pageHtml).toContain('New Post');

    const html = await readFile(siteIndexPath, 'utf8');
    expect(html).toContain('href="/writing/new-post/"');
  });

  it('publishes downstream platforms with the website URL as canonical, once the website is live', async () => {
    const article = makeArticle();
    article.frontmatter.syndication.website = {
      status: 'synced',
      url: 'https://joeblack.nyc/writing/new-post/',
    };
    const deps = makeDeps(siteIndexPath, { live: { website: true, devtoUrl: null } });

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(deps.manualPublishers.substack.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        articleUrl: 'https://joeblack.nyc/writing/new-post/',
        articleContent: 'The article body.',
      }),
    );
    expect(deps.manualPublishers.medium.publish).toHaveBeenCalledWith(
      expect.objectContaining({ articleUrl: 'https://joeblack.nyc/writing/new-post/' }),
    );
    expect(deps.manualPublishers.medium.publish.mock.calls[0][0].articleContent).toBeUndefined();
    expect(article.frontmatter.syndication.devto).toEqual({
      status: 'synced',
      url: 'https://dev.to/joe/new-post',
    });
  });

  it('returns false and touches nothing when there are no gaps', async () => {
    const article = makeArticle();
    article.frontmatter.syndication.website = { status: 'synced', url: 'https://joeblack.nyc/writing/new-post/' };
    article.frontmatter.syndication.substack = { status: 'synced', url: 'https://sub.example.com/p/new' };
    article.frontmatter.syndication.medium = { status: 'synced', url: null };
    article.frontmatter.syndication.x = { status: 'synced', url: null };
    article.frontmatter.syndication.devto = { status: 'synced', url: 'https://dev.to/joe/new-post' };

    const deps = makeDeps(siteIndexPath, {
      live: { website: true, devtoUrl: 'https://dev.to/joe/new-post' },
    });

    const changed = await syncArticle(article, deps);
    expect(changed).toBe(false);
  });
});
```

Add `import { dirname } from 'node:path';` and `import { vi } from 'vitest';` to this file's imports
(`vi` alongside the existing `beforeEach, describe, expect, it` import).

- [ ] **Step 3: Run tests to verify RED**

Run: `pnpm vitest run tests/sync-article.test.ts --pool=forks`
Expected: FAIL — `SyncArticleDeps` doesn't have `siteBaseUrl` yet, `syncWebsite` still takes a
`canonicalUrl` param sourced from `substack.url`, and `syncManualPlatform` never sets `articleContent`.

- [ ] **Step 4: Rewrite `sync-article.ts`**

Replace the full contents of `nursery/syndicate/src/sync-article.ts`:

```typescript
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type EditPrompt, approveCaption } from './approve.js';
import { type DevtoPostClient, publishToDevto } from './devto-publisher.js';
import { type LiveStatus, computeGaps } from './diff.js';
import { type Draft, type DraftModel, draftCaptions } from './draft.js';
import type { Publisher } from './publishers/publisher.js';
import { estimateReadTime } from './read-time.js';
import type { Article, PlatformKey } from './types.js';
import { insertWritingCard, renderArticlePage } from './website-publisher.js';

type ManualPlatform = 'substack' | 'medium' | 'x' | 'linkedin' | 'facebook';
type CaptionPlatform = 'x' | 'linkedin' | 'facebook';

const CAPTION_PLATFORMS: ReadonlySet<PlatformKey> = new Set(['x', 'linkedin', 'facebook']);
const SYNCED_STATUS = 'synced' as const;

function isCaptionPlatform(platform: PlatformKey): platform is CaptionPlatform {
  return CAPTION_PLATFORMS.has(platform);
}

export type SyncArticleDeps = {
  live: LiveStatus;
  devtoPostClient: DevtoPostClient;
  draftModel: DraftModel;
  editPrompt: EditPrompt;
  siteIndexPath: string;
  siteBaseUrl: string;
  /** Called after every individual platform action, so a Ctrl+C mid-article loses nothing already confirmed. */
  persistFrontmatter: (article: Article) => Promise<void>;
  manualPublishers: Record<ManualPlatform, Publisher>;
};

async function syncWebsite(article: Article, deps: SyncArticleDeps, draft: Draft | null): Promise<void> {
  const { slug } = article.frontmatter;
  const tag = draft?.website.tag ?? 'Writing';
  article.frontmatter.publishedAt = new Date().toISOString();

  const pageHtml = renderArticlePage(article, deps.siteBaseUrl, tag);
  const pagePath = path.join(path.dirname(deps.siteIndexPath), 'writing', slug, 'index.html');
  await mkdir(path.dirname(pagePath), { recursive: true });
  await writeFile(pagePath, pageHtml, 'utf8');

  const html = await readFile(deps.siteIndexPath, 'utf8');
  const updated = insertWritingCard(html, {
    slug,
    tag,
    title: article.frontmatter.title,
    url: `/writing/${slug}/`,
    readTime: estimateReadTime(article.content),
  });
  await writeFile(deps.siteIndexPath, updated, 'utf8');

  article.frontmatter.syndication.website = {
    status: SYNCED_STATUS,
    url: `${deps.siteBaseUrl}/writing/${slug}/`,
  };
}

async function syncDevto(article: Article, deps: SyncArticleDeps, canonicalUrl: string): Promise<void> {
  const url = await publishToDevto(deps.devtoPostClient, {
    title: article.frontmatter.title,
    bodyMarkdown: article.content,
    canonicalUrl,
    tags: article.frontmatter.tags,
  });
  article.frontmatter.syndication.devto = { status: SYNCED_STATUS, url };
}

async function resolveCaption(
  platform: ManualPlatform,
  deps: SyncArticleDeps,
  draft: Draft | null,
): Promise<string | undefined> {
  if (!isCaptionPlatform(platform) || !draft) return undefined;
  return approveCaption(deps.editPrompt, platform, draft[platform]);
}

async function syncManualPlatform(
  platform: ManualPlatform,
  article: Article,
  deps: SyncArticleDeps,
  draft: Draft | null,
  canonicalUrl: string,
): Promise<void> {
  const publisher = deps.manualPublishers[platform];
  const caption = await resolveCaption(platform, deps, draft);

  const result = await publisher.publish({
    articleTitle: article.frontmatter.title,
    articleUrl: canonicalUrl,
    ...(platform === 'substack' ? { articleContent: article.content } : {}),
    ...(caption === undefined ? {} : { caption }),
  });

  article.frontmatter.syndication[platform] = { status: SYNCED_STATUS, url: result.url ?? null };
}

async function syncPlatform(
  platform: PlatformKey,
  article: Article,
  deps: SyncArticleDeps,
  draft: Draft | null,
  canonicalUrl: string,
): Promise<void> {
  if (platform === 'website') {
    await syncWebsite(article, deps, draft);
    return;
  }
  if (platform === 'devto') {
    await syncDevto(article, deps, canonicalUrl);
    return;
  }
  await syncManualPlatform(platform, article, deps, draft, canonicalUrl);
}

export async function syncArticle(article: Article, deps: SyncArticleDeps): Promise<boolean> {
  const gaps = computeGaps(article, deps.live);
  if (gaps.length === 0) return false;

  const canonicalUrl = article.frontmatter.syndication.website.url ?? '';
  const needsDraft = gaps.some((platform) => isCaptionPlatform(platform)) || gaps.includes('website');
  const draft = needsDraft
    ? await draftCaptions(deps.draftModel, article.content, canonicalUrl)
    : null;

  for (const platform of gaps) {
    await syncPlatform(platform, article, deps, draft, canonicalUrl);
    await deps.persistFrontmatter(article);
  }

  return true;
}
```

- [ ] **Step 5: Run tests to verify GREEN**

Run: `pnpm vitest run tests/sync-article.test.ts --pool=forks`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add nursery/syndicate/src/sync-article.ts nursery/syndicate/src/publishers/publisher.ts nursery/syndicate/tests/sync-article.test.ts
git commit -m "feat(syndicate): website publishes first and becomes the canonical URL for every other platform"
```

---

### Task 9: `substack-publisher.ts` — copy content + backlink

**Files:**
- Modify: `nursery/syndicate/src/publishers/substack-publisher.ts`
- Test: `nursery/syndicate/tests/publishers/substack-publisher.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `nursery/syndicate/tests/publishers/substack-publisher.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createSubstackPublisher } from '../../src/publishers/substack-publisher.js';

describe('createSubstackPublisher', () => {
  it('copies the article content plus a backlink, links to the new-post page, and returns the resulting URL', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createSubstackPublisher(
      clipboardWrite,
      promptForUrl,
      'https://joeblackwaslike.substack.com/publish',
      formatLink,
    );

    const result = await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: 'https://joeblack.nyc/writing/new-post/',
      articleContent: 'The full article body.',
    });

    expect(clipboardWrite).toHaveBeenCalledWith(
      'The full article body.\n\n---\n\nOriginally published at https://joeblack.nyc/writing/new-post/',
    );
    expect(formatLink).toHaveBeenCalledWith(
      'https://joeblackwaslike.substack.com/publish',
      expect.any(String),
    );
    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'synced', url: 'https://sub.example.com/p/new' });
  });

  it('copies just the backlink when no article content is given', async () => {
    const clipboardWrite = vi.fn(async () => {});
    const promptForUrl = vi.fn(async () => 'https://sub.example.com/p/new');
    const formatLink = vi.fn((url: string) => url);
    const publisher = createSubstackPublisher(
      clipboardWrite,
      promptForUrl,
      'https://joeblackwaslike.substack.com/publish',
      formatLink,
    );

    await publisher.publish({
      articleTitle: 'New Post',
      articleUrl: 'https://joeblack.nyc/writing/new-post/',
    });

    expect(clipboardWrite).toHaveBeenCalledWith(
      '\n\n---\n\nOriginally published at https://joeblack.nyc/writing/new-post/',
    );
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm vitest run tests/publishers/substack-publisher.test.ts --pool=forks`
Expected: FAIL — `createSubstackPublisher` doesn't take a `clipboardWrite` param yet.

- [ ] **Step 3: Rewrite `substack-publisher.ts`**

Replace the full contents of `nursery/syndicate/src/publishers/substack-publisher.ts`:

```typescript
import type { ClipboardWriter } from './clipboard-publisher.js';
import type { LinkFormatter, PublishInput, PublishResult, Publisher } from './publisher.js';

export type UrlPrompt = (message: string) => Promise<string>;

function buildClipboardText(input: PublishInput): string {
  const backlink = `Originally published at ${input.articleUrl}`;
  return input.articleContent ? `${input.articleContent}\n\n---\n\n${backlink}` : `\n\n---\n\n${backlink}`;
}

export function createSubstackPublisher(
  clipboardWrite: ClipboardWriter,
  promptForUrl: UrlPrompt,
  newPostUrl: string,
  formatLink: LinkFormatter,
): Publisher {
  return {
    platform: 'substack',
    async publish(input: PublishInput): Promise<PublishResult> {
      await clipboardWrite(buildClipboardText(input));

      const url = await promptForUrl(
        `Copied article + backlink to clipboard — go to ${formatLink(newPostUrl, 'your Substack new-post page')} and paste it into a new post, publish it, then paste the resulting URL:`,
      );
      return { status: 'synced', url };
    },
  };
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `pnpm vitest run tests/publishers/substack-publisher.test.ts --pool=forks`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/publishers/substack-publisher.ts nursery/syndicate/tests/publishers/substack-publisher.test.ts
git commit -m "feat(syndicate): substack publisher copies article content + a backlink to the site"
```

---

### Task 10: `cli.ts` — wire it all together

**Files:**
- Modify: `nursery/syndicate/src/cli.ts`
- Test: `nursery/syndicate/tests/cli.test.ts`

- [ ] **Step 1: Update `cli.test.ts`'s fixtures**

In `nursery/syndicate/tests/cli.test.ts`, add `siteBaseUrl` to `makeContext()`'s return object:

```typescript
function makeContext(): SyncContext {
  return {
    siteIndexPath: SITE_INDEX_PATH,
    siteBaseUrl: 'https://joeblack.nyc',
    devtoClient: { listMyArticles: vi.fn() },
    devtoPostClient: { createArticle: vi.fn() },
    draftModel: { generate: vi.fn() },
    editPrompt: vi.fn(),
    manualPublishers: {
      substack: { platform: 'substack', publish: vi.fn() },
      medium: { platform: 'medium', publish: vi.fn() },
      x: { platform: 'x', publish: vi.fn() },
      linkedin: { platform: 'linkedin', publish: vi.fn() },
      facebook: { platform: 'facebook', publish: vi.fn() },
    },
  };
}
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run tests/cli.test.ts --pool=forks`
Expected: FAIL (TypeScript error) — `SyncContext` doesn't have `siteBaseUrl` yet.

- [ ] **Step 3: Update `cli.ts`**

In `nursery/syndicate/src/cli.ts`:

1. Add `siteBaseUrl: string;` to the `SyncContext` type.
2. Update `createManualPublishers` to accept and thread through `siteBaseUrl`, and wire
   `defaultClipboardWrite` into the Substack publisher.
3. Update `syncSingleArticle` to check website-liveness by slug and read the canonical URL from
   `syndication.website.url`.
4. Update `runSync` to read `config.SITE_BASE_URL` into the context.

```typescript
function createManualPublishers(config: Config): ManualPublishers {
  const substackNewPostUrl = `https://${config.SUBSTACK_SUBDOMAIN}.substack.com/publish`;

  return {
    substack: createSubstackPublisher(
      defaultClipboardWrite,
      (message) => input({ message }),
      substackNewPostUrl,
      terminalLink,
    ),
    medium: createMediumPublisher((message) => input({ message }), terminalLink),
    x: createClipboardPublisher(
      'x',
      defaultClipboardWrite,
      confirm,
      terminalLink,
      buildXDestinationLink,
    ),
    linkedin: createClipboardPublisher(
      'linkedin',
      defaultClipboardWrite,
      confirm,
      terminalLink,
      buildLinkedinDestinationLink,
    ),
    facebook: createClipboardPublisher(
      'facebook',
      defaultClipboardWrite,
      confirm,
      terminalLink,
      buildFacebookDestinationLink,
    ),
  };
}

export async function syncSingleArticle(article: Article, context: SyncContext): Promise<boolean> {
  const website = await isArticleOnWebsite(context.siteIndexPath, article.frontmatter.slug);
  const canonicalUrl = article.frontmatter.syndication.website.url;
  const devtoUrl = canonicalUrl ? await isArticleOnDevto(context.devtoClient, canonicalUrl) : null;

  return syncArticle(article, {
    live: { website, devtoUrl },
    devtoPostClient: context.devtoPostClient,
    draftModel: context.draftModel,
    editPrompt: context.editPrompt,
    siteIndexPath: context.siteIndexPath,
    siteBaseUrl: context.siteBaseUrl,
    persistFrontmatter: writeArticleFrontmatter,
    manualPublishers: context.manualPublishers,
  });
}
```

```typescript
export async function runSync(repoRoot: string): Promise<void> {
  const config = loadConfig();
  const articlesDir = `${repoRoot}/${config.ARTICLES_DIR}`;
  const siteIndexPath = `${repoRoot}/${config.SITE_INDEX_PATH}`;

  const context: SyncContext = {
    siteIndexPath,
    siteBaseUrl: config.SITE_BASE_URL,
    devtoClient: createDevtoClient(config.DEVTO_API_KEY),
    devtoPostClient: createDevtoPostClient(config.DEVTO_API_KEY),
    draftModel: createClaudeDraftModel(),
    editPrompt: createInquirerEditPrompt(),
    manualPublishers: createManualPublishers(config),
  };

  const articles = await scanReadyArticles(articlesDir);

  await runSyncArticles(articles, context, {
    syncOne: syncSingleArticle,
    commitAndPush: commitAndPushByRepo,
  });
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm vitest run tests/cli.test.ts --pool=forks`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/cli.ts nursery/syndicate/tests/cli.test.ts
git commit -m "feat(syndicate): wire SITE_BASE_URL and the website-first canonical flow into the CLI"
```

---

### Task 11: Full verification and real-build smoke test

**Files:** none (verification only)

- [ ] **Step 1: Full syndicate suite**

Run: `cd nursery/syndicate && pnpm vitest run --pool=forks`
Expected: all tests pass.

- [ ] **Step 2: Syndicate typecheck + lint**

Run: `pnpm check`
Expected: clean (0 errors; pre-existing `noConsole` warnings in `cli.ts` are known and unrelated).

- [ ] **Step 3: Site tests**

Run: `cd ../../site && npm test`
Expected: `catalog.test.js` still passes (untouched by this change).

- [ ] **Step 4: Real end-to-end smoke test of `renderArticlePage` + a real `vite build`**

```bash
cd /Users/joe/github/joeblackwaslike/agent-marketplace/nursery/syndicate
pnpm build
node -e "
import('./dist/website-publisher.js').then(({ renderArticlePage }) => {
  const article = {
    filePath: '/tmp/x.md',
    content: '# Hello\n\nSome *text* with a [link](https://example.com).\n',
    frontmatter: {
      title: 'Smoke Test',
      slug: 'smoke-test',
      status: 'ready',
      tags: ['ai'],
      description: 'A smoke test article.',
      publishedAt: new Date().toISOString(),
      syndication: {
        substack: { status: 'pending', url: null },
        medium: { status: 'pending', url: null },
        devto: { status: 'pending', url: null },
        website: { status: 'pending' },
        x: { status: 'pending' },
        linkedin: { status: 'pending' },
        facebook: { status: 'pending' },
      },
    },
  };
  const html = renderArticlePage(article, 'https://joeblack.nyc', 'AI Agents');
  require('node:fs').mkdirSync('../../site/writing/smoke-test', { recursive: true });
  require('node:fs').writeFileSync('../../site/writing/smoke-test/index.html', html);
  console.log('written');
});
"
cd ../../site
npm run build
grep -o 'assets/[^"]*\.css' dist/writing/smoke-test/index.html
rm -rf writing dist/writing
```

Expected: `npm run build` succeeds, the grep prints a hashed CSS filename (confirming Vite processed
the fixture page through its real asset pipeline), then the fixture is removed.

- [ ] **Step 5: Commit any residual formatting fixups only if lint/format made changes in prior steps**

```bash
cd /Users/joe/github/joeblackwaslike/agent-marketplace
git status
```

If clean, nothing to commit here — every task already committed its own changes.

- [ ] **Step 6: Push**

```bash
git push
```

- [ ] **Step 7: Report to Joe**

Note in the final summary: the next real `syndicate sync` run will regenerate
`site/writing/i-thought-id-lost-the-plot/index.html` for the already-published article and update its
homepage card in place (self-healing backfill, no manual migration) — the visible effect is that
`site/index.html`'s existing hand-written card for that article (currently linking to Substack) gets
replaced by a data-slug-tagged one linking internally, and `syndication.substack`/`medium`/`devto`
stay `synced` and are NOT re-actioned (already live).
