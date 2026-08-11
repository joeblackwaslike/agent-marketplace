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
import { resolveArticlePagePath } from './website-status.js';

type ManualPlatform = 'substack' | 'medium' | 'x' | 'linkedin' | 'facebook' | 'instagram';
type CaptionPlatform = 'x' | 'linkedin' | 'facebook' | 'instagram';

const CAPTION_PLATFORMS: ReadonlySet<PlatformKey> = new Set([
  'x',
  'linkedin',
  'facebook',
  'instagram',
]);
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

async function syncWebsite(
  article: Article,
  deps: SyncArticleDeps,
  draft: Draft | null,
): Promise<void> {
  const { slug } = article.frontmatter;
  const tag = draft?.website.tag ?? 'Writing';
  article.frontmatter.publishedAt = new Date().toISOString();
  article.frontmatter.syndication.website = {
    status: SYNCED_STATUS,
    url: `${deps.siteBaseUrl}/writing/${slug}/`,
  };

  // Persist before writing the page file: once the page file exists, the
  // website gap becomes permanently non-retriable (see website-status.ts /
  // diff.ts), so the URL it guards must already be durable before that
  // happens. Otherwise a crash between the file write and the outer loop's
  // persistFrontmatter call would silently and permanently blank
  // canonicalUrl for every downstream platform.
  await deps.persistFrontmatter(article);

  const pageHtml = renderArticlePage(article, deps.siteBaseUrl, tag);
  const pagePath = resolveArticlePagePath(deps.siteIndexPath, slug);
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
}

async function syncDevto(
  article: Article,
  deps: SyncArticleDeps,
  canonicalUrl: string,
): Promise<void> {
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
  const needsDraft =
    gaps.some((platform) => isCaptionPlatform(platform)) || gaps.includes('website');
  const draft = needsDraft
    ? await draftCaptions(deps.draftModel, article.content, canonicalUrl)
    : null;

  for (const platform of gaps) {
    await syncPlatform(platform, article, deps, draft, canonicalUrl);
    await deps.persistFrontmatter(article);
  }

  return true;
}
