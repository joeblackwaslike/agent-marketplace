export type PlatformKey =
  | 'substack'
  | 'medium'
  | 'devto'
  | 'website'
  | 'x'
  | 'linkedin'
  | 'facebook'
  | 'instagram';

export type SyncStatus = 'pending' | 'synced';

export type PlatformSync = {
  status: SyncStatus;
  url?: string | null;
};

export type Frontmatter = {
  title: string;
  slug: string;
  status: 'draft' | 'ready';
  tags: string[];
  description: string;
  publishedAt: string | null;
  syndication: Record<PlatformKey, PlatformSync>;
  websiteTag?: string;
  websiteContentHash?: string;
};

export type Article = {
  filePath: string;
  frontmatter: Frontmatter;
  content: string;
};
