# Syndicate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `nursery/syndicate`, a personal CLI that treats "what's synced where" as a reconciliation problem against flat markdown articles (source of truth), syncing new/changed articles to Substack, Medium, dev.to, `joeblack.nyc`, X, LinkedIn, and Facebook — automating what has a free API (dev.to, the website) and walking through manual copy/paste for what doesn't (Substack, Medium, X, LinkedIn, Facebook).

**Architecture:** Pure functions for all business logic (frontmatter diffing, gap computation, HTML insertion, read-time estimation), with every I/O boundary (Claude API, dev.to API, clipboard, prompts, git) behind an injectable interface so the orchestration logic is fully unit-testable without live network/clipboard/git. A thin Commander CLI wires real implementations at the edge.

**Tech Stack:** TypeScript (strict, ESM), pnpm, Vitest, Biome, `gray-matter` (frontmatter), `fast-glob`, `clipboardy`, `@inquirer/prompts`, `commander`, `ai` + `@ai-sdk/anthropic` (structured output via `generateObject`), `zod`.

Spec: `docs/superpowers/specs/2026-08-08-syndicate-design.md`

---

### Task 1: Scaffold project + shared types + config

**Files:**
- Create: `nursery/syndicate/` (via spinup-ts)
- Create: `nursery/syndicate/src/types.ts`
- Create: `nursery/syndicate/src/config.ts`
- Test: `nursery/syndicate/test/config.test.ts`

- [ ] **Step 1: Scaffold with spinup-ts**

Run: `cd nursery && pnpm dlx spinup-ts syndicate` (guided prompts: TS strict, Vitest, Biome, no framework — plain Node CLI)

Expected: `nursery/syndicate/` exists with `package.json`, `tsconfig.json`, `biome.json`, `.husky/`, `src/`, `test/`.

- [ ] **Step 2: Install runtime dependencies**

Run: `cd nursery/syndicate && pnpm add zod gray-matter fast-glob clipboardy @inquirer/prompts commander ai @ai-sdk/anthropic`

Expected: all six added to `dependencies` in `package.json`.

- [ ] **Step 3: Write shared types**

```typescript
// src/types.ts
export type PlatformKey =
  | "substack"
  | "medium"
  | "devto"
  | "website"
  | "x"
  | "linkedin"
  | "facebook";

export type SyncStatus = "pending" | "synced";

export type PlatformSync = {
  status: SyncStatus;
  url?: string | null;
};

export type Frontmatter = {
  title: string;
  slug: string;
  status: "draft" | "ready";
  tags: string[];
  description: string;
  publishedAt: string | null;
  syndication: Record<PlatformKey, PlatformSync>;
};

export type Article = {
  filePath: string;
  frontmatter: Frontmatter;
  content: string;
};
```

- [ ] **Step 4: Write the failing test for config**

```typescript
// test/config.test.ts
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("parses a valid env", () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
      DEVTO_API_KEY: "devto-test",
    });
    expect(config.ARTICLES_DIR).toBe("private-content/drafts/articles");
    expect(config.SITE_INDEX_PATH).toBe("site/index.html");
  });

  it("throws when ANTHROPIC_API_KEY is missing", () => {
    expect(() => loadConfig({ DEVTO_API_KEY: "devto-test" })).toThrow();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm vitest run test/config.test.ts`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 6: Write config.ts**

```typescript
// src/config.ts
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DEVTO_API_KEY: z.string().min(1),
  ARTICLES_DIR: z.string().default("private-content/drafts/articles"),
  SITE_INDEX_PATH: z.string().default("site/index.html"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  return envSchema.parse(env);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm vitest run test/config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add nursery/syndicate
git commit -m "feat(syndicate): scaffold project, shared types, config"
```

---

### Task 2: Read-time estimation

**Files:**
- Create: `nursery/syndicate/src/read-time.ts`
- Test: `nursery/syndicate/test/read-time.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/read-time.test.ts
import { describe, expect, it } from "vitest";
import { estimateReadTime } from "../src/read-time.js";

describe("estimateReadTime", () => {
  it("rounds to the nearest minute at 200wpm", () => {
    const words = Array.from({ length: 1000 }, () => "word").join(" ");
    expect(estimateReadTime(words)).toBe(5);
  });

  it("never returns less than 1 minute", () => {
    expect(estimateReadTime("short")).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/read-time.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write read-time.ts**

```typescript
// src/read-time.ts
const WORDS_PER_MINUTE = 200;

export function estimateReadTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/read-time.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/read-time.ts nursery/syndicate/test/read-time.test.ts
git commit -m "feat(syndicate): read-time estimation"
```

---

### Task 3: Frontmatter read/write

**Files:**
- Create: `nursery/syndicate/src/frontmatter.ts`
- Test: `nursery/syndicate/test/frontmatter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/frontmatter.test.ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readArticle, writeArticleFrontmatter } from "../src/frontmatter.js";

const FIXTURE = `---
title: Test Article
slug: test-article
status: ready
tags: [testing]
description: A test.
publishedAt: null
syndication:
  substack: { status: pending, url: null }
  medium: { status: pending, url: null }
  devto: { status: pending, url: null }
  website: { status: pending }
  x: { status: pending }
  linkedin: { status: pending }
  facebook: { status: pending }
---

This is the article body.

It has two paragraphs.
`;

describe("frontmatter round-trip", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "syndicate-test-"));
    filePath = join(dir, "test-article.md");
    await writeFile(filePath, FIXTURE, "utf8");
  });

  it("preserves content and reads frontmatter fields", async () => {
    const article = await readArticle(filePath);
    expect(article.frontmatter.title).toBe("Test Article");
    expect(article.frontmatter.status).toBe("ready");
    expect(article.content.trim()).toBe(
      "This is the article body.\n\nIt has two paragraphs.",
    );
  });

  it("writes only frontmatter changes, leaving content untouched", async () => {
    const article = await readArticle(filePath);
    article.frontmatter.syndication.substack = {
      status: "synced",
      url: "https://example.com/p/test",
    };
    await writeArticleFrontmatter(article);

    const reread = await readArticle(filePath);
    expect(reread.frontmatter.syndication.substack.status).toBe("synced");
    expect(reread.content.trim()).toBe(article.content.trim());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/frontmatter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write frontmatter.ts**

```typescript
// src/frontmatter.ts
import { readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import type { Article, Frontmatter } from "./types.js";

export async function readArticle(filePath: string): Promise<Article> {
  const raw = await readFile(filePath, "utf8");
  const parsed = matter(raw);
  return {
    filePath,
    frontmatter: parsed.data as Frontmatter,
    content: parsed.content,
  };
}

export async function writeArticleFrontmatter(article: Article): Promise<void> {
  const output = matter.stringify(article.content, article.frontmatter);
  await writeFile(article.filePath, output, "utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/frontmatter.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/frontmatter.ts nursery/syndicate/test/frontmatter.test.ts
git commit -m "feat(syndicate): frontmatter read/write"
```

---

### Task 4: Scan ready articles

**Files:**
- Create: `nursery/syndicate/src/scan.ts`
- Test: `nursery/syndicate/test/scan.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/scan.test.ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { scanReadyArticles } from "../src/scan.js";

const readyArticle = `---
title: Ready Article
slug: ready-article
status: ready
tags: []
description: ""
publishedAt: null
syndication:
  substack: { status: pending, url: null }
  medium: { status: pending, url: null }
  devto: { status: pending, url: null }
  website: { status: pending }
  x: { status: pending }
  linkedin: { status: pending }
  facebook: { status: pending }
---
Ready body.
`;

const draftArticle = readyArticle
  .replace("status: ready", "status: draft")
  .replace("Ready Article", "Draft Article");

describe("scanReadyArticles", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "syndicate-scan-"));
    await writeFile(join(dir, "ready.md"), readyArticle, "utf8");
    await writeFile(join(dir, "draft.md"), draftArticle, "utf8");
  });

  it("returns only status: ready articles", async () => {
    const articles = await scanReadyArticles(dir);
    expect(articles).toHaveLength(1);
    expect(articles[0].frontmatter.title).toBe("Ready Article");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/scan.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write scan.ts**

```typescript
// src/scan.ts
import fg from "fast-glob";
import { readArticle } from "./frontmatter.js";
import type { Article } from "./types.js";

export async function scanReadyArticles(articlesDir: string): Promise<Article[]> {
  const files = await fg("*.md", { cwd: articlesDir, absolute: true });
  const articles = await Promise.all(files.map((file) => readArticle(file)));
  return articles.filter((article) => article.frontmatter.status === "ready");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/scan.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/scan.ts nursery/syndicate/test/scan.test.ts
git commit -m "feat(syndicate): scan ready articles"
```

---

### Task 5: Git commit/push helper

**Files:**
- Create: `nursery/syndicate/src/git.ts`
- Test: `nursery/syndicate/test/git.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/git.test.ts
import { describe, expect, it, vi } from "vitest";
import { commitAndPush } from "../src/git.js";

describe("commitAndPush", () => {
  it("runs add, commit, push in order with the given paths and message", async () => {
    const calls: string[][] = [];
    const gitExec = vi.fn(async (args: string[]) => {
      calls.push(args);
    });

    await commitAndPush(["a.md", "b.html"], "chore: sync", "/repo", gitExec);

    expect(calls).toEqual([
      ["add", "a.md", "b.html"],
      ["commit", "-m", "chore: sync"],
      ["push"],
    ]);
    expect(gitExec).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/git.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write git.ts**

```typescript
// src/git.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitExec = (args: string[], cwd: string) => Promise<void>;

export const runGit: GitExec = async (args, cwd) => {
  await execFileAsync("git", args, { cwd });
};

export async function commitAndPush(
  paths: string[],
  message: string,
  cwd: string,
  gitExec: GitExec = runGit,
): Promise<void> {
  await gitExec(["add", ...paths], cwd);
  await gitExec(["commit", "-m", message], cwd);
  await gitExec(["push"], cwd);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/git.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/git.ts nursery/syndicate/test/git.test.ts
git commit -m "feat(syndicate): git commit/push helper"
```

---

### Task 6: Website status + publisher

**Files:**
- Create: `nursery/syndicate/src/website-status.ts`
- Create: `nursery/syndicate/src/website-publisher.ts`
- Test: `nursery/syndicate/test/website-status.test.ts`
- Test: `nursery/syndicate/test/website-publisher.test.ts`

- [ ] **Step 1: Write the failing test for website-status**

```typescript
// test/website-status.test.ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { isArticleOnWebsite } from "../src/website-status.js";

describe("isArticleOnWebsite", () => {
  let filePath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), "syndicate-site-"));
    filePath = join(dir, "index.html");
    await writeFile(
      filePath,
      `<div class="writing-list"><a href="https://sub.example.com/p/one">One</a></div>`,
      "utf8",
    );
  });

  it("returns true when the article URL is already linked", async () => {
    expect(
      await isArticleOnWebsite(filePath, "https://sub.example.com/p/one"),
    ).toBe(true);
  });

  it("returns false when the article URL is not present", async () => {
    expect(
      await isArticleOnWebsite(filePath, "https://sub.example.com/p/two"),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/website-status.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write website-status.ts**

```typescript
// src/website-status.ts
import { readFile } from "node:fs/promises";

export async function isArticleOnWebsite(
  siteIndexPath: string,
  articleUrl: string,
): Promise<boolean> {
  const html = await readFile(siteIndexPath, "utf8");
  return html.includes(`href="${articleUrl}"`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/website-status.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for website-publisher**

```typescript
// test/website-publisher.test.ts
import { describe, expect, it } from "vitest";
import { insertWritingCard } from "../src/website-publisher.js";

const BASE_HTML = `<section><div class="writing-list"><article>existing</article></div></section>`;

describe("insertWritingCard", () => {
  it("inserts a new card right after the writing-list marker", () => {
    const result = insertWritingCard(BASE_HTML, {
      tag: "AI Agents",
      title: "New Post",
      url: "https://sub.example.com/p/new",
      readTime: 5,
    });

    expect(result).toContain('<span class="writing-tag">AI Agents</span>');
    expect(result).toContain('href="https://sub.example.com/p/new"');
    expect(result).toContain("5 min read");
    expect(result.indexOf("New Post")).toBeLessThan(result.indexOf("existing"));
  });

  it("HTML-escapes title and tag", () => {
    const result = insertWritingCard(BASE_HTML, {
      tag: "<script>",
      title: 'Title with "quotes" & <tags>',
      url: "https://sub.example.com/p/x",
      readTime: 1,
    });

    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("&amp;");
    expect(result).toContain("&lt;tags&gt;");
  });

  it("throws when the writing-list marker is missing", () => {
    expect(() =>
      insertWritingCard("<div>no marker</div>", {
        tag: "x",
        title: "y",
        url: "z",
        readTime: 1,
      }),
    ).toThrow(/writing-list/);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run test/website-publisher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Write website-publisher.ts**

```typescript
// src/website-publisher.ts
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type WritingCardEntry = {
  tag: string;
  title: string;
  url: string;
  readTime: number;
};

export function insertWritingCard(html: string, entry: WritingCardEntry): string {
  const marker = '<div class="writing-list">';
  const index = html.indexOf(marker);
  if (index === -1) {
    throw new Error("writing-list marker not found in site index");
  }
  const insertAt = index + marker.length;
  const card = `<article class="writing-card reveal"><span class="writing-tag">${escapeHtml(
    entry.tag,
  )}</span><h3 class="writing-title"><a href="${escapeHtml(entry.url)}">${escapeHtml(
    entry.title,
  )}</a></h3><p class="writing-meta">${entry.readTime} min read</p></article>`;
  return html.slice(0, insertAt) + card + html.slice(insertAt);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm vitest run test/website-publisher.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add nursery/syndicate/src/website-status.ts nursery/syndicate/src/website-publisher.ts nursery/syndicate/test/website-status.test.ts nursery/syndicate/test/website-publisher.test.ts
git commit -m "feat(syndicate): website status check and writing-card insertion"
```

---

### Task 7: dev.to status + publisher

**Files:**
- Create: `nursery/syndicate/src/devto-status.ts`
- Create: `nursery/syndicate/src/devto-publisher.ts`
- Test: `nursery/syndicate/test/devto-status.test.ts`
- Test: `nursery/syndicate/test/devto-publisher.test.ts`

- [ ] **Step 1: Write the failing test for devto-status**

```typescript
// test/devto-status.test.ts
import { describe, expect, it } from "vitest";
import { isArticleOnDevto, type DevtoClient } from "../src/devto-status.js";

describe("isArticleOnDevto", () => {
  const client: DevtoClient = {
    async listMyArticles() {
      return [
        { canonical_url: "https://sub.example.com/p/one", url: "https://dev.to/joe/one" },
      ];
    },
  };

  it("returns the dev.to URL when a canonical_url match is found", async () => {
    expect(
      await isArticleOnDevto(client, "https://sub.example.com/p/one"),
    ).toBe("https://dev.to/joe/one");
  });

  it("returns null when no match is found", async () => {
    expect(
      await isArticleOnDevto(client, "https://sub.example.com/p/missing"),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/devto-status.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write devto-status.ts**

```typescript
// src/devto-status.ts
export type DevtoArticleSummary = {
  canonical_url: string | null;
  url: string;
};

export type DevtoClient = {
  listMyArticles: () => Promise<DevtoArticleSummary[]>;
};

export async function isArticleOnDevto(
  client: DevtoClient,
  canonicalUrl: string,
): Promise<string | null> {
  const articles = await client.listMyArticles();
  const match = articles.find((article) => article.canonical_url === canonicalUrl);
  return match ? match.url : null;
}

export function createDevtoClient(apiKey: string): DevtoClient {
  return {
    async listMyArticles() {
      const response = await fetch("https://dev.to/api/articles/me", {
        headers: { "api-key": apiKey },
      });
      if (!response.ok) {
        throw new Error(`dev.to API error: ${response.status}`);
      }
      return response.json();
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/devto-status.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for devto-publisher**

```typescript
// test/devto-publisher.test.ts
import { describe, expect, it, vi } from "vitest";
import { publishToDevto, type DevtoPostClient } from "../src/devto-publisher.js";

describe("publishToDevto", () => {
  it("passes canonical_url, tags, and markdown body through to the client", async () => {
    const createArticle = vi.fn(async () => ({ url: "https://dev.to/joe/new" }));
    const client: DevtoPostClient = { createArticle };

    const url = await publishToDevto(client, {
      title: "New Post",
      bodyMarkdown: "# body",
      canonicalUrl: "https://sub.example.com/p/new",
      tags: ["ai", "agents"],
    });

    expect(url).toBe("https://dev.to/joe/new");
    expect(createArticle).toHaveBeenCalledWith({
      title: "New Post",
      bodyMarkdown: "# body",
      canonicalUrl: "https://sub.example.com/p/new",
      tags: ["ai", "agents"],
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run test/devto-publisher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Write devto-publisher.ts**

```typescript
// src/devto-publisher.ts
export type DevtoPublishInput = {
  title: string;
  bodyMarkdown: string;
  canonicalUrl: string;
  tags: string[];
};

export type DevtoPostClient = {
  createArticle: (input: DevtoPublishInput) => Promise<{ url: string }>;
};

export async function publishToDevto(
  client: DevtoPostClient,
  input: DevtoPublishInput,
): Promise<string> {
  const result = await client.createArticle(input);
  return result.url;
}

export function createDevtoPostClient(apiKey: string): DevtoPostClient {
  return {
    async createArticle(input) {
      const response = await fetch("https://dev.to/api/articles", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          article: {
            title: input.title,
            body_markdown: input.bodyMarkdown,
            published: true,
            canonical_url: input.canonicalUrl,
            tags: input.tags,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`dev.to publish failed: ${response.status}`);
      }
      const data = (await response.json()) as { url: string };
      return { url: data.url };
    },
  };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm vitest run test/devto-publisher.test.ts`
Expected: PASS (1 test)

- [ ] **Step 9: Commit**

```bash
git add nursery/syndicate/src/devto-status.ts nursery/syndicate/src/devto-publisher.ts nursery/syndicate/test/devto-status.test.ts nursery/syndicate/test/devto-publisher.test.ts
git commit -m "feat(syndicate): dev.to status check and publisher"
```

---

### Task 8: Gap computation (diff)

**Files:**
- Create: `nursery/syndicate/src/diff.ts`
- Test: `nursery/syndicate/test/diff.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/diff.test.ts
import { describe, expect, it } from "vitest";
import { computeGaps } from "../src/diff.js";
import type { Article } from "../src/types.js";

function makeArticle(overrides: Partial<Article["frontmatter"]["syndication"]>): Article {
  return {
    filePath: "/tmp/a.md",
    content: "body",
    frontmatter: {
      title: "T",
      slug: "t",
      status: "ready",
      tags: [],
      description: "",
      publishedAt: null,
      syndication: {
        substack: { status: "pending", url: null },
        medium: { status: "pending", url: null },
        devto: { status: "pending", url: null },
        website: { status: "pending" },
        x: { status: "pending" },
        linkedin: { status: "pending" },
        facebook: { status: "pending" },
        ...overrides,
      },
    },
  };
}

describe("computeGaps", () => {
  it("returns only ['substack'] when substack is not yet synced, regardless of others", () => {
    const article = makeArticle({ x: { status: "synced" } });
    expect(computeGaps(article, { website: true, devtoUrl: "https://dev.to/x" })).toEqual([
      "substack",
    ]);
  });

  it("returns remaining gaps in fixed order once substack is synced", () => {
    const article = makeArticle({
      substack: { status: "synced", url: "https://sub.example.com/p/x" },
      x: { status: "synced" },
      facebook: { status: "synced" },
    });
    expect(computeGaps(article, { website: false, devtoUrl: null })).toEqual([
      "medium",
      "devto",
      "website",
      "linkedin",
    ]);
  });

  it("returns an empty array when everything is synced", () => {
    const synced = { status: "synced" as const };
    const article = makeArticle({
      substack: { ...synced, url: "https://sub.example.com/p/x" },
      medium: synced,
      x: synced,
      linkedin: synced,
      facebook: synced,
    });
    expect(computeGaps(article, { website: true, devtoUrl: "https://dev.to/x" })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/diff.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write diff.ts**

```typescript
// src/diff.ts
import type { Article, PlatformKey } from "./types.js";

export type LiveStatus = {
  website: boolean;
  devtoUrl: string | null;
};

const DOWNSTREAM_ORDER: PlatformKey[] = [
  "medium",
  "devto",
  "website",
  "x",
  "linkedin",
  "facebook",
];

export function computeGaps(article: Article, live: LiveStatus): PlatformKey[] {
  const { syndication } = article.frontmatter;

  if (syndication.substack.status !== "synced") {
    return ["substack"];
  }

  const gaps: PlatformKey[] = [];
  for (const platform of DOWNSTREAM_ORDER) {
    if (platform === "website") {
      if (!live.website) gaps.push("website");
      continue;
    }
    if (platform === "devto") {
      if (!live.devtoUrl) gaps.push("devto");
      continue;
    }
    if (syndication[platform].status !== "synced") {
      gaps.push(platform);
    }
  }
  return gaps;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/diff.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/diff.ts nursery/syndicate/test/diff.test.ts
git commit -m "feat(syndicate): per-article gap computation with substack-first gating"
```

---

### Task 9: Voice guide + Claude caption drafting

**Files:**
- Create: `nursery/syndicate/src/voice.md`
- Create: `nursery/syndicate/src/draft.ts`
- Test: `nursery/syndicate/test/draft.test.ts`

- [ ] **Step 1: Write voice.md**

```markdown
# Voice guide for drafted captions

Write like Joe actually talks: direct, specific, no hype-hooks, no "I'm excited to share."
Lead with a concrete detail from the article, not a generic teaser. Never write "new post:"
or "check out my latest." Assume the reader is a peer, not an audience to be sold to.

- X: one sharp, specific line plus the URL. No hashtags.
- LinkedIn: 2-4 short paragraphs, professional framing, still concrete over vague.
- Facebook: more narrative, a couple sentences of context before the point.
- Website blurb: a one- or two-word topic tag only (e.g. "Claude Code", "AI Agents").
```

- [ ] **Step 2: Write the failing test**

```typescript
// test/draft.test.ts
import { describe, expect, it } from "vitest";
import { buildDraftPrompt, draftCaptions, type Draft, type DraftModel } from "../src/draft.js";

describe("draftCaptions", () => {
  it("passes the model's structured output straight through", async () => {
    const fixture: Draft = {
      x: "One sharp line. https://sub.example.com/p/x",
      linkedin: "Longer take.",
      facebook: "Narrative take.",
      website: { tag: "AI Agents" },
    };
    const model: DraftModel = { generate: async () => fixture };

    const result = await draftCaptions(model, "article body", "https://sub.example.com/p/x");
    expect(result).toEqual(fixture);
  });
});

describe("buildDraftPrompt", () => {
  it("includes the article URL and content", async () => {
    const prompt = await buildDraftPrompt("article body text", "https://sub.example.com/p/x");
    expect(prompt).toContain("https://sub.example.com/p/x");
    expect(prompt).toContain("article body text");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run test/draft.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write draft.ts**

```typescript
// src/draft.ts
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const draftSchema = z.object({
  x: z.string().max(280),
  linkedin: z.string(),
  facebook: z.string(),
  website: z.object({ tag: z.string() }),
});

export type Draft = z.infer<typeof draftSchema>;

export type DraftModel = {
  generate: (prompt: string) => Promise<Draft>;
};

export function createClaudeDraftModel(): DraftModel {
  return {
    async generate(prompt: string) {
      const { object } = await generateObject({
        model: anthropic("claude-sonnet-5"),
        schema: draftSchema,
        prompt,
      });
      return object;
    },
  };
}

export async function buildDraftPrompt(
  articleContent: string,
  articleUrl: string,
): Promise<string> {
  const voiceGuide = await readFile(join(__dirname, "voice.md"), "utf8");
  return [voiceGuide, "---", `Article URL: ${articleUrl}`, "---", articleContent].join("\n\n");
}

export async function draftCaptions(
  model: DraftModel,
  articleContent: string,
  articleUrl: string,
): Promise<Draft> {
  const prompt = await buildDraftPrompt(articleContent, articleUrl);
  return model.generate(prompt);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run test/draft.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add nursery/syndicate/src/voice.md nursery/syndicate/src/draft.ts nursery/syndicate/test/draft.test.ts
git commit -m "feat(syndicate): voice guide and Claude caption drafting"
```

---

### Task 10: Publishers — interface, clipboard, substack, medium

**Files:**
- Create: `nursery/syndicate/src/publishers/publisher.ts`
- Create: `nursery/syndicate/src/publishers/clipboard-publisher.ts`
- Create: `nursery/syndicate/src/publishers/substack-publisher.ts`
- Create: `nursery/syndicate/src/publishers/medium-publisher.ts`
- Test: `nursery/syndicate/test/publishers/clipboard-publisher.test.ts`
- Test: `nursery/syndicate/test/publishers/substack-publisher.test.ts`
- Test: `nursery/syndicate/test/publishers/medium-publisher.test.ts`

- [ ] **Step 1: Write publisher.ts (interface, no test needed — types only)**

```typescript
// src/publishers/publisher.ts
export type PublishInput = {
  articleTitle: string;
  articleUrl: string;
  caption?: string;
};

export type PublishResult = {
  status: "synced";
  url?: string;
};

export type Publisher = {
  platform: string;
  publish: (input: PublishInput) => Promise<PublishResult>;
};
```

- [ ] **Step 2: Write the failing test for clipboard-publisher**

```typescript
// test/publishers/clipboard-publisher.test.ts
import { describe, expect, it, vi } from "vitest";
import { createClipboardPublisher } from "../../src/publishers/clipboard-publisher.js";

describe("createClipboardPublisher", () => {
  it("copies the caption when present, waits for confirmation, and reports synced", async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const publisher = createClipboardPublisher("x", clipboardWrite, confirm);

    const result = await publisher.publish({
      articleTitle: "T",
      articleUrl: "https://sub.example.com/p/x",
      caption: "One sharp line.",
    });

    expect(clipboardWrite).toHaveBeenCalledWith("One sharp line.");
    expect(confirm).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: "synced" });
  });

  it("falls back to the article URL when no caption is given", async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const publisher = createClipboardPublisher("x", clipboardWrite, confirm);

    await publisher.publish({ articleTitle: "T", articleUrl: "https://sub.example.com/p/x" });

    expect(clipboardWrite).toHaveBeenCalledWith("https://sub.example.com/p/x");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run test/publishers/clipboard-publisher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write clipboard-publisher.ts**

```typescript
// src/publishers/clipboard-publisher.ts
import type { Publisher, PublishInput, PublishResult } from "./publisher.js";

export type ClipboardWriter = (text: string) => Promise<void>;
export type ConfirmPrompt = (message: string) => Promise<void>;

export function createClipboardPublisher(
  platform: string,
  clipboardWrite: ClipboardWriter,
  confirm: ConfirmPrompt,
): Publisher {
  return {
    platform,
    async publish(input: PublishInput): Promise<PublishResult> {
      const text = input.caption ?? input.articleUrl;
      await clipboardWrite(text);
      await confirm(`Paste into ${platform} now, then press Enter to confirm.`);
      return { status: "synced" };
    },
  };
}

export async function defaultClipboardWrite(text: string): Promise<void> {
  const { default: clipboardy } = await import("clipboardy");
  await clipboardy.write(text);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run test/publishers/clipboard-publisher.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the failing test for substack-publisher**

```typescript
// test/publishers/substack-publisher.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSubstackPublisher } from "../../src/publishers/substack-publisher.js";

describe("createSubstackPublisher", () => {
  it("prompts for the resulting URL and returns it", async () => {
    const promptForUrl = vi.fn(async () => "https://sub.example.com/p/new");
    const publisher = createSubstackPublisher(promptForUrl);

    const result = await publisher.publish({
      articleTitle: "New Post",
      articleUrl: "",
    });

    expect(promptForUrl).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: "synced", url: "https://sub.example.com/p/new" });
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run test/publishers/substack-publisher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 8: Write substack-publisher.ts**

```typescript
// src/publishers/substack-publisher.ts
import type { Publisher, PublishInput, PublishResult } from "./publisher.js";

export type UrlPrompt = (message: string) => Promise<string>;

export function createSubstackPublisher(promptForUrl: UrlPrompt): Publisher {
  return {
    platform: "substack",
    async publish(input: PublishInput): Promise<PublishResult> {
      console.log(`Paste "${input.articleTitle}" into a new Substack post and publish it.`);
      const url = await promptForUrl("Paste the resulting Substack URL:");
      return { status: "synced", url };
    },
  };
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run test/publishers/substack-publisher.test.ts`
Expected: PASS (1 test)

- [ ] **Step 10: Write the failing test for medium-publisher**

```typescript
// test/publishers/medium-publisher.test.ts
import { describe, expect, it, vi } from "vitest";
import { createMediumPublisher } from "../../src/publishers/medium-publisher.js";

describe("createMediumPublisher", () => {
  it("always copies the article URL, even if a caption is present, and confirms", async () => {
    const clipboardWrite = vi.fn(async () => {});
    const confirm = vi.fn(async () => {});
    const publisher = createMediumPublisher(clipboardWrite, confirm);

    const result = await publisher.publish({
      articleTitle: "T",
      articleUrl: "https://sub.example.com/p/x",
      caption: "should be ignored",
    });

    expect(clipboardWrite).toHaveBeenCalledWith("https://sub.example.com/p/x");
    expect(confirm).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: "synced" });
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `pnpm vitest run test/publishers/medium-publisher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 12: Write medium-publisher.ts**

```typescript
// src/publishers/medium-publisher.ts
import type { ClipboardWriter, ConfirmPrompt } from "./clipboard-publisher.js";
import type { Publisher, PublishInput, PublishResult } from "./publisher.js";

export function createMediumPublisher(
  clipboardWrite: ClipboardWriter,
  confirm: ConfirmPrompt,
): Publisher {
  return {
    platform: "medium",
    async publish(input: PublishInput): Promise<PublishResult> {
      await clipboardWrite(input.articleUrl);
      await confirm(
        "Paste this URL into medium.com/p/import, publish, then press Enter to confirm.",
      );
      return { status: "synced" };
    },
  };
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `pnpm vitest run test/publishers/medium-publisher.test.ts`
Expected: PASS (1 test)

- [ ] **Step 14: Commit**

```bash
git add nursery/syndicate/src/publishers nursery/syndicate/test/publishers
git commit -m "feat(syndicate): publisher interface, clipboard, substack, and medium publishers"
```

---

### Task 11: Caption approval loop

**Files:**
- Create: `nursery/syndicate/src/approve.ts`
- Test: `nursery/syndicate/test/approve.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/approve.test.ts
import { describe, expect, it, vi } from "vitest";
import { approveCaption } from "../src/approve.js";

describe("approveCaption", () => {
  it("shows the platform and draft, returning the (possibly edited) result", async () => {
    const editPrompt = vi.fn(async (_label: string, initial: string) => `${initial} (edited)`);

    const result = await approveCaption(editPrompt, "x", "Original draft.");

    expect(editPrompt).toHaveBeenCalledWith(
      "Review/edit the x caption (Enter to accept as-is):",
      "Original draft.",
    );
    expect(result).toBe("Original draft. (edited)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/approve.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write approve.ts**

```typescript
// src/approve.ts
export type EditPrompt = (label: string, initialValue: string) => Promise<string>;

export async function approveCaption(
  editPrompt: EditPrompt,
  platform: string,
  draftText: string,
): Promise<string> {
  return editPrompt(`Review/edit the ${platform} caption (Enter to accept as-is):`, draftText);
}

export function createInquirerEditPrompt(): EditPrompt {
  return async (label, initialValue) => {
    const { input } = await import("@inquirer/prompts");
    return input({ message: label, default: initialValue });
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/approve.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add nursery/syndicate/src/approve.ts nursery/syndicate/test/approve.test.ts
git commit -m "feat(syndicate): caption approval loop"
```

---

### Task 12: Article sync orchestration + CLI

**Files:**
- Create: `nursery/syndicate/src/sync-article.ts`
- Create: `nursery/syndicate/src/cli.ts`
- Test: `nursery/syndicate/test/sync-article.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/sync-article.test.ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncArticle, type SyncArticleDeps } from "../src/sync-article.js";
import type { Article } from "../src/types.js";

function makeArticle(): Article {
  return {
    filePath: "/tmp/article.md",
    content: "The article body.",
    frontmatter: {
      title: "New Post",
      slug: "new-post",
      status: "ready",
      tags: ["ai"],
      description: "",
      publishedAt: null,
      syndication: {
        substack: { status: "synced", url: "https://sub.example.com/p/new" },
        medium: { status: "pending", url: null },
        devto: { status: "pending", url: null },
        website: { status: "pending" },
        x: { status: "pending" },
        linkedin: { status: "synced" },
        facebook: { status: "synced" },
      },
    },
  };
}

describe("syncArticle", () => {
  let siteIndexPath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), "syndicate-sync-"));
    siteIndexPath = join(dir, "index.html");
    await writeFile(siteIndexPath, `<div class="writing-list"></div>`, "utf8");
  });

  it("publishes only the gap platforms and updates frontmatter accordingly", async () => {
    const article = makeArticle();
    const mediumPublish = vi.fn(async () => ({ status: "synced" as const }));
    const xPublish = vi.fn(async () => ({ status: "synced" as const }));

    const persistFrontmatter = vi.fn(async () => {});

    const deps: SyncArticleDeps = {
      live: { website: false, devtoUrl: null },
      devtoPostClient: {
        createArticle: vi.fn(async () => ({ url: "https://dev.to/joe/new-post" })),
      },
      draftModel: {
        generate: async () => ({
          x: "Sharp line.",
          linkedin: "unused",
          facebook: "unused",
          website: { tag: "AI Agents" },
        }),
      },
      editPrompt: async (_label, initial) => initial,
      siteIndexPath,
      persistFrontmatter,
      manualPublishers: {
        substack: { platform: "substack", publish: vi.fn() },
        medium: { platform: "medium", publish: mediumPublish },
        x: { platform: "x", publish: xPublish },
        linkedin: { platform: "linkedin", publish: vi.fn() },
        facebook: { platform: "facebook", publish: vi.fn() },
      },
    };

    const changed = await syncArticle(article, deps);

    expect(changed).toBe(true);
    expect(mediumPublish).toHaveBeenCalledOnce();
    expect(xPublish).toHaveBeenCalledWith(
      expect.objectContaining({ caption: "Sharp line." }),
    );
    expect(article.frontmatter.syndication.medium.status).toBe("synced");
    expect(article.frontmatter.syndication.devto).toEqual({
      status: "synced",
      url: "https://dev.to/joe/new-post",
    });
    expect(article.frontmatter.syndication.website.status).toBe("synced");

    const html = await readFile(siteIndexPath, "utf8");
    expect(html).toContain("New Post");

    // one persist call per gap platform actioned (medium, devto, website, x)
    expect(persistFrontmatter).toHaveBeenCalledTimes(4);
    expect(persistFrontmatter).toHaveBeenLastCalledWith(article);
  });

  it("returns false and touches nothing when there are no gaps", async () => {
    const article = makeArticle();
    article.frontmatter.syndication.medium = { status: "synced", url: null };
    article.frontmatter.syndication.website = { status: "synced" };
    article.frontmatter.syndication.x = { status: "synced", url: null };

    const deps: SyncArticleDeps = {
      live: { website: true, devtoUrl: "https://dev.to/joe/new-post" },
      devtoPostClient: { createArticle: vi.fn() },
      draftModel: { generate: vi.fn() },
      editPrompt: vi.fn(),
      siteIndexPath,
      persistFrontmatter: vi.fn(async () => {}),
      manualPublishers: {
        substack: { platform: "substack", publish: vi.fn() },
        medium: { platform: "medium", publish: vi.fn() },
        x: { platform: "x", publish: vi.fn() },
        linkedin: { platform: "linkedin", publish: vi.fn() },
        facebook: { platform: "facebook", publish: vi.fn() },
      },
    };
    article.frontmatter.syndication.devto = { status: "synced", url: "https://dev.to/joe/new-post" };

    const changed = await syncArticle(article, deps);
    expect(changed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/sync-article.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write sync-article.ts**

```typescript
// src/sync-article.ts
import { readFile, writeFile } from "node:fs/promises";
import { computeGaps, type LiveStatus } from "./diff.js";
import { estimateReadTime } from "./read-time.js";
import { insertWritingCard } from "./website-publisher.js";
import { publishToDevto, type DevtoPostClient } from "./devto-publisher.js";
import { draftCaptions, type DraftModel } from "./draft.js";
import { approveCaption, type EditPrompt } from "./approve.js";
import type { Publisher } from "./publishers/publisher.js";
import type { Article, PlatformKey } from "./types.js";

type ManualPlatform = "substack" | "medium" | "x" | "linkedin" | "facebook";
const CAPTION_PLATFORMS: PlatformKey[] = ["x", "linkedin", "facebook"];

export type SyncArticleDeps = {
  live: LiveStatus;
  devtoPostClient: DevtoPostClient;
  draftModel: DraftModel;
  editPrompt: EditPrompt;
  siteIndexPath: string;
  /** Called after every individual platform action, so a Ctrl+C mid-article loses nothing already confirmed. */
  persistFrontmatter: (article: Article) => Promise<void>;
  manualPublishers: Record<ManualPlatform, Publisher>;
};

export async function syncArticle(article: Article, deps: SyncArticleDeps): Promise<boolean> {
  const gaps = computeGaps(article, deps.live);
  if (gaps.length === 0) return false;

  const canonicalUrl = article.frontmatter.syndication.substack.url ?? "";
  const needsDraft = gaps.some((platform) => CAPTION_PLATFORMS.includes(platform));
  const draft = needsDraft
    ? await draftCaptions(deps.draftModel, article.content, canonicalUrl)
    : null;

  for (const platform of gaps) {
    if (platform === "website") {
      const html = await readFile(deps.siteIndexPath, "utf8");
      const updated = insertWritingCard(html, {
        tag: draft?.website.tag ?? "Writing",
        title: article.frontmatter.title,
        url: canonicalUrl,
        readTime: estimateReadTime(article.content),
      });
      await writeFile(deps.siteIndexPath, updated, "utf8");
      article.frontmatter.syndication.website = { status: "synced" };
      await deps.persistFrontmatter(article);
      continue;
    }

    if (platform === "devto") {
      const url = await publishToDevto(deps.devtoPostClient, {
        title: article.frontmatter.title,
        bodyMarkdown: article.content,
        canonicalUrl,
        tags: article.frontmatter.tags,
      });
      article.frontmatter.syndication.devto = { status: "synced", url };
      await deps.persistFrontmatter(article);
      continue;
    }

    const manualPlatform = platform as ManualPlatform;
    const publisher = deps.manualPublishers[manualPlatform];
    const caption = CAPTION_PLATFORMS.includes(platform)
      ? await approveCaption(deps.editPrompt, platform, draft![platform as "x" | "linkedin" | "facebook"])
      : undefined;

    const result = await publisher.publish({
      articleTitle: article.frontmatter.title,
      articleUrl: canonicalUrl,
      caption,
    });

    article.frontmatter.syndication[platform] = { status: "synced", url: result.url ?? null };
    if (platform === "substack") {
      article.frontmatter.publishedAt = new Date().toISOString();
    }
    await deps.persistFrontmatter(article);
  }

  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/sync-article.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write cli.ts**

```typescript
// src/cli.ts
import { input } from "@inquirer/prompts";
import { Command } from "commander";
import { approveCaption, createInquirerEditPrompt } from "./approve.js";
import { loadConfig } from "./config.js";
import { createClaudeDraftModel } from "./draft.js";
import { createDevtoClient, isArticleOnDevto } from "./devto-status.js";
import { createDevtoPostClient } from "./devto-publisher.js";
import { writeArticleFrontmatter } from "./frontmatter.js";
import { commitAndPush } from "./git.js";
import { createClipboardPublisher, defaultClipboardWrite } from "./publishers/clipboard-publisher.js";
import { createMediumPublisher } from "./publishers/medium-publisher.js";
import { createSubstackPublisher } from "./publishers/substack-publisher.js";
import { scanReadyArticles } from "./scan.js";
import { syncArticle } from "./sync-article.js";
import { isArticleOnWebsite } from "./website-status.js";

async function confirm(message: string): Promise<void> {
  await input({ message: `${message} (press Enter)` });
}

export async function runSync(repoRoot: string): Promise<void> {
  const config = loadConfig();
  const articlesDir = `${repoRoot}/${config.ARTICLES_DIR}`;
  const siteIndexPath = `${repoRoot}/${config.SITE_INDEX_PATH}`;

  const devtoClient = createDevtoClient(config.DEVTO_API_KEY);
  const devtoPostClient = createDevtoPostClient(config.DEVTO_API_KEY);
  const draftModel = createClaudeDraftModel();
  const editPrompt = createInquirerEditPrompt();

  const manualPublishers = {
    substack: createSubstackPublisher((message) => input({ message })),
    medium: createMediumPublisher(defaultClipboardWrite, confirm),
    x: createClipboardPublisher("x", defaultClipboardWrite, confirm),
    linkedin: createClipboardPublisher("linkedin", defaultClipboardWrite, confirm),
    facebook: createClipboardPublisher("facebook", defaultClipboardWrite, confirm),
  };

  const articles = await scanReadyArticles(articlesDir);
  const changedFiles: string[] = [];

  for (const article of articles) {
    const canonicalUrl = article.frontmatter.syndication.substack.url;
    const website = canonicalUrl ? await isArticleOnWebsite(siteIndexPath, canonicalUrl) : false;
    const devtoUrl = canonicalUrl ? await isArticleOnDevto(devtoClient, canonicalUrl) : null;

    const changed = await syncArticle(article, {
      live: { website, devtoUrl },
      devtoPostClient,
      draftModel,
      editPrompt,
      siteIndexPath,
      persistFrontmatter: writeArticleFrontmatter,
      manualPublishers,
    });

    if (changed) {
      changedFiles.push(article.filePath, siteIndexPath);
    }
  }

  if (changedFiles.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const uniquePaths = Array.from(new Set(changedFiles));
  await commitAndPush(uniquePaths, "chore(syndicate): sync articles", repoRoot);
  console.log(`Synced. Updated: ${uniquePaths.join(", ")}`);
}

export async function runBaseline(repoRoot: string, filePath: string): Promise<void> {
  const { readArticle } = await import("./frontmatter.js");
  const article = await readArticle(filePath);

  for (const platform of Object.keys(article.frontmatter.syndication) as Array<
    keyof typeof article.frontmatter.syndication
  >) {
    const isSynced = await input({
      message: `Is "${article.frontmatter.title}" already synced on ${platform}? (y/n)`,
    });
    if (isSynced.toLowerCase().startsWith("y")) {
      const url =
        platform === "website"
          ? undefined
          : await input({ message: `URL for ${platform} (blank if none):` });
      article.frontmatter.syndication[platform] = { status: "synced", url: url || null };
    }
  }

  await writeArticleFrontmatter(article);
  await commitAndPush([filePath], "chore(syndicate): baseline existing article", repoRoot);
}

const program = new Command();

program
  .command("sync")
  .description("Sync all ready articles to any platform missing them")
  .action(async () => {
    await runSync(process.cwd());
  });

program
  .command("baseline <file>")
  .description("Mark an already-published article's existing sync status without publishing")
  .action(async (file: string) => {
    await runBaseline(process.cwd(), file);
  });

program.parseAsync(process.argv);
```

- [ ] **Step 6: Manual smoke check**

Run: `cd nursery/syndicate && pnpm exec tsc --noEmit`
Expected: no type errors.

Run: `pnpm exec node --experimental-strip-types src/cli.ts sync` with a `.env` containing dummy keys and no ready articles in `ARTICLES_DIR`
Expected: prints `Nothing to do.` and exits 0.

- [ ] **Step 7: Commit**

```bash
git add nursery/syndicate/src/sync-article.ts nursery/syndicate/src/cli.ts nursery/syndicate/test/sync-article.test.ts
git commit -m "feat(syndicate): article sync orchestration and CLI entrypoint"
```

---

### Task 13: Mark the existing article ready and baseline it

**Files:**
- Modify: `private-content/drafts/articles/2026-08-08-writing-the-plot.md` (frontmatter only)

- [ ] **Step 1: Add syndication frontmatter to the existing article**

Prepend frontmatter to the top of the file (content below the existing `---` boundary, if any, stays untouched):

```yaml
---
title: "I Thought I'd Lost the Plot. I Was Writing It."
slug: i-thought-id-lost-the-plot
status: ready
tags: [claude-code, ai-agents, autonomous-agents]
description: "I set out to build autonomous agents. I spent two years building the scaffolding instead."
publishedAt: null
syndication:
  substack: { status: pending, url: null }
  medium: { status: pending, url: null }
  devto: { status: pending, url: null }
  website: { status: pending }
  x: { status: pending }
  linkedin: { status: pending }
  facebook: { status: pending }
---
```

- [ ] **Step 2: Run `syndicate baseline` for whichever platforms are already live**

Run: `cd nursery/syndicate && pnpm exec node --experimental-strip-types src/cli.ts baseline ../../private-content/drafts/articles/2026-08-08-writing-the-plot.md`

Answer the interactive prompts based on actual current publish status (e.g. `y` + URL for Substack/Medium if already posted there, `n` for anything not yet posted).

Expected: frontmatter updated, file committed and pushed by the baseline command itself.

- [ ] **Step 3: Verify**

Run: `git log --oneline -1` — should show the baseline commit.

---

## Notes for whoever executes this

- Tasks 1–11 are pure/injectable and fully unit-testable — no live credentials needed.
- Task 12's manual smoke check and Task 13 need real `ANTHROPIC_API_KEY` / `DEVTO_API_KEY` values (via `.env`, loaded through `dotenv` or the shell) and will make a real Anthropic/dev.to call the first time `syndicate sync` actually processes an article with gaps — don't run `sync` for real against the live article until you're ready to actually publish it.
