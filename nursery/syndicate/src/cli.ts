#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { input } from '@inquirer/prompts';
import { Command } from 'commander';
import { type EditPrompt, createInquirerEditPrompt } from './approve.js';
import { type Config, loadConfig, loadDotEnv } from './config.js';
import { type DevtoPostClient, createDevtoPostClient } from './devto-publisher.js';
import { type DevtoClient, createDevtoClient, isArticleOnDevto } from './devto-status.js';
import { type DraftModel, createClaudeDraftModel } from './draft.js';
import { readArticle, writeArticleFrontmatter } from './frontmatter.js';
import { commitAndPushByRepo, resolveRepoRoot } from './git.js';
import {
  type DestinationLink,
  createClipboardPublisher,
  defaultClipboardWrite,
} from './publishers/clipboard-publisher.js';
import { createMediumPublisher } from './publishers/medium-publisher.js';
import type { Publisher } from './publishers/publisher.js';
import { createSubstackPublisher } from './publishers/substack-publisher.js';
import { scanReadyArticles } from './scan.js';
import { syncArticle } from './sync-article.js';
import { terminalLink } from './terminal-link.js';
import type { Article, PlatformKey } from './types.js';
import { isArticleOnWebsite } from './website-status.js';

export type ManualPublishers = Record<
  'substack' | 'medium' | 'x' | 'linkedin' | 'facebook',
  Publisher
>;

export type SyncContext = {
  siteIndexPath: string;
  siteBaseUrl: string;
  devtoClient: DevtoClient;
  devtoPostClient: DevtoPostClient;
  draftModel: DraftModel;
  editPrompt: EditPrompt;
  manualPublishers: ManualPublishers;
};

async function confirm(message: string): Promise<void> {
  await input({ message: `${message} (press Enter)` });
}

const X_INTENT_URL = 'https://x.com/intent/post';
const LINKEDIN_FEED_URL = 'https://www.linkedin.com/feed/';
const FACEBOOK_HOME_URL = 'https://www.facebook.com/';

function buildXDestinationLink(text: string): DestinationLink {
  return { url: `${X_INTENT_URL}?text=${encodeURIComponent(text)}`, label: 'x.com' };
}

function buildLinkedinDestinationLink(): DestinationLink {
  return { url: LINKEDIN_FEED_URL, label: 'linkedin.com/feed' };
}

function buildFacebookDestinationLink(): DestinationLink {
  return { url: FACEBOOK_HOME_URL, label: 'facebook.com' };
}

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

export type RunSyncArticlesDeps = {
  syncOne: (article: Article, context: SyncContext) => Promise<boolean>;
  commitAndPush: (paths: string[], message: string) => Promise<void>;
};

async function commitPartialProgress(
  changedFiles: string[],
  deps: RunSyncArticlesDeps,
): Promise<void> {
  if (changedFiles.length === 0) return;
  const uniquePaths = [...new Set(changedFiles)];
  await deps.commitAndPush(uniquePaths, 'chore(syndicate): sync articles (partial run)');
}

/**
 * Runs the per-article sync loop and commits whatever succeeded — including when a later
 * article throws, so already-completed work is never stranded uncommitted on disk. Commits are
 * routed per-repo (see `commitAndPushByRepo`), since an article's file and the website file can
 * live in different git repositories (e.g. a `private-content` submodule).
 */
export async function runSyncArticles(
  articles: Article[],
  context: SyncContext,
  deps: RunSyncArticlesDeps,
): Promise<void> {
  const changedFiles: string[] = [];

  try {
    for (const article of articles) {
      try {
        const changed = await deps.syncOne(article, context);
        if (changed) {
          changedFiles.push(article.filePath, context.siteIndexPath);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed syncing "${article.filePath}": ${detail}. Earlier articles in this run may have local changes not yet committed/pushed — check git status.`,
          { cause: error },
        );
      }
    }
  } catch (error) {
    await commitPartialProgress(changedFiles, deps);
    throw error;
  }

  if (changedFiles.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const uniquePaths = [...new Set(changedFiles)];
  await deps.commitAndPush(uniquePaths, 'chore(syndicate): sync articles');
  console.log(`Synced. Updated: ${uniquePaths.join(', ')}`);
}

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

export async function runBaseline(filePath: string): Promise<void> {
  const article = await readArticle(filePath);

  const platforms = Object.keys(article.frontmatter.syndication) as PlatformKey[];
  for (const platform of platforms) {
    await baselinePlatform(article, platform);
  }

  await writeArticleFrontmatter(article);
  await commitAndPushByRepo([filePath], 'chore(syndicate): baseline existing article');
}

function isMainModule(): boolean {
  const entryPoint = process.argv[1];
  if (entryPoint === undefined) return false;
  return import.meta.url === pathToFileURL(realpathSync(entryPoint)).href;
}

async function main(): Promise<void> {
  loadDotEnv();

  const program = new Command();

  program
    .command('sync')
    .description('Sync all ready articles to any platform missing them')
    .action(async () => {
      await runSync(resolveRepoRoot());
    });

  program
    .command('baseline <file>')
    .description("Mark an already-published article's existing sync status without publishing")
    .action(async (file: string) => {
      await runBaseline(file);
    });

  await program.parseAsync(process.argv);
}

// Only run the CLI when this file is the process entry point — importing it (e.g. from tests)
// must not trigger commander's argv parsing or exit the process.
if (isMainModule()) {
  try {
    await main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
