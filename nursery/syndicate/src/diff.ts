import type { Article, PlatformKey } from './types.js';

export type LiveStatus = {
  website: boolean;
  devtoUrl: string | null;
};

const DOWNSTREAM_ORDER: PlatformKey[] = ['medium', 'devto', 'website', 'x', 'linkedin', 'facebook'];

function isPlatformLive(
  platform: PlatformKey,
  syndication: Article['frontmatter']['syndication'],
  live: LiveStatus,
): boolean {
  if (platform === 'website') return live.website;
  if (platform === 'devto') return live.devtoUrl !== null;
  return syndication[platform].status === 'synced';
}

export function computeGaps(article: Article, live: LiveStatus): PlatformKey[] {
  const { syndication } = article.frontmatter;

  if (syndication.substack.status !== 'synced') {
    return ['substack'];
  }

  return DOWNSTREAM_ORDER.filter((platform) => !isPlatformLive(platform, syndication, live));
}
