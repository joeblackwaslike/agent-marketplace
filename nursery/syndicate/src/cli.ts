import { input } from '@inquirer/prompts';
import { Command } from 'commander';
import { type EditPrompt, createInquirerEditPrompt } from './approve.js';
import { loadConfig } from './config.js';
import { type DevtoPostClient, createDevtoPostClient } from './devto-publisher.js';
import { type DevtoClient, createDevtoClient, isArticleOnDevto } from './devto-status.js';
import { type DraftModel, createClaudeDraftModel } from './draft.js';
import { readArticle, writeArticleFrontmatter } from './frontmatter.js';
import { commitAndPush } from './git.js';
import {
  createClipboardPublisher,
  defaultClipboardWrite,
} from './publishers/clipboard-publisher.js';
import { createMediumPublisher } from './publishers/medium-publisher.js';
import type { Publisher } from './publishers/publisher.js';
import { createSubstackPublisher } from './publishers/substack-publisher.js';
import { scanReadyArticles } from './scan.js';
import { syncArticle } from './sync-article.js';
import type { Article, PlatformKey } from './types.js';
import { isArticleOnWebsite } from './website-status.js';

type ManualPublishers = Record<'substack' | 'medium' | 'x' | 'linkedin' | 'facebook', Publisher>;

type SyncContext = {
  siteIndexPath: string;
  devtoClient: DevtoClient;
  devtoPostClient: DevtoPostClient;
  draftModel: DraftModel;
  editPrompt: EditPrompt;
  manualPublishers: ManualPublishers;
};

async function confirm(message: string): Promise<void> {
  await input({ message: `${message} (press Enter)` });
}

function createManualPublishers(): ManualPublishers {
  return {
    substack: createSubstackPublisher((message) => input({ message })),
    medium: createMediumPublisher(defaultClipboardWrite, confirm),
    x: createClipboardPublisher('x', defaultClipboardWrite, confirm),
    linkedin: createClipboardPublisher('linkedin', defaultClipboardWrite, confirm),
    facebook: createClipboardPublisher('facebook', defaultClipboardWrite, confirm),
  };
}

async function syncSingleArticle(article: Article, context: SyncContext): Promise<boolean> {
  const canonicalUrl = article.frontmatter.syndication.substack.url;
  const website = canonicalUrl
    ? await isArticleOnWebsite(context.siteIndexPath, canonicalUrl)
    : false;
  const devtoUrl = canonicalUrl ? await isArticleOnDevto(context.devtoClient, canonicalUrl) : null;

  return syncArticle(article, {
    live: { website, devtoUrl },
    devtoPostClient: context.devtoPostClient,
    draftModel: context.draftModel,
    editPrompt: context.editPrompt,
    siteIndexPath: context.siteIndexPath,
    persistFrontmatter: writeArticleFrontmatter,
    manualPublishers: context.manualPublishers,
  });
}

export async function runSync(repoRoot: string): Promise<void> {
  const config = loadConfig();
  const articlesDir = `${repoRoot}/${config.ARTICLES_DIR}`;
  const siteIndexPath = `${repoRoot}/${config.SITE_INDEX_PATH}`;

  const context: SyncContext = {
    siteIndexPath,
    devtoClient: createDevtoClient(config.DEVTO_API_KEY),
    devtoPostClient: createDevtoPostClient(config.DEVTO_API_KEY),
    draftModel: createClaudeDraftModel(),
    editPrompt: createInquirerEditPrompt(),
    manualPublishers: createManualPublishers(),
  };

  const articles = await scanReadyArticles(articlesDir);
  const changedFiles: string[] = [];

  for (const article of articles) {
    const changed = await syncSingleArticle(article, context);
    if (changed) {
      changedFiles.push(article.filePath, siteIndexPath);
    }
  }

  if (changedFiles.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const uniquePaths = [...new Set(changedFiles)];
  await commitAndPush(uniquePaths, 'chore(syndicate): sync articles', repoRoot);
  console.log(`Synced. Updated: ${uniquePaths.join(', ')}`);
}

async function baselinePlatform(article: Article, platform: PlatformKey): Promise<void> {
  const isSynced = await input({
    message: `Is "${article.frontmatter.title}" already synced on ${platform}? (y/n)`,
  });
  if (!isSynced.toLowerCase().startsWith('y')) return;

  const url =
    platform === 'website'
      ? undefined
      : await input({ message: `URL for ${platform} (blank if none):` });
  const resolvedUrl = url && url.length > 0 ? url : null;
  article.frontmatter.syndication[platform] = { status: 'synced', url: resolvedUrl };
}

export async function runBaseline(repoRoot: string, filePath: string): Promise<void> {
  const article = await readArticle(filePath);

  const platforms = Object.keys(article.frontmatter.syndication) as PlatformKey[];
  for (const platform of platforms) {
    await baselinePlatform(article, platform);
  }

  await writeArticleFrontmatter(article);
  await commitAndPush([filePath], 'chore(syndicate): baseline existing article', repoRoot);
}

const program = new Command();

program
  .command('sync')
  .description('Sync all ready articles to any platform missing them')
  .action(async () => {
    await runSync(process.cwd());
  });

program
  .command('baseline <file>')
  .description("Mark an already-published article's existing sync status without publishing")
  .action(async (file: string) => {
    await runBaseline(process.cwd(), file);
  });

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
