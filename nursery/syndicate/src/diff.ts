import type { Article, PlatformKey } from './types.js';

export type LiveStatus = {
  website: boolean;
  devtoUrl: string | null;
};

const DOWNSTREAM_ORDER: PlatformKey[] = [
  'substack',
  'medium',
  'devto',
  'x',
  'linkedin',
  'facebook',
  'instagram',
];

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
