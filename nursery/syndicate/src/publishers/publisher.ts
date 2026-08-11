export type PublishInput = {
  articleTitle: string;
  articleUrl: string;
  caption?: string;
};

export type PublishResult = {
  status: 'synced';
  url?: string;
};

export type Publisher = {
  platform: string;
  publish: (input: PublishInput) => Promise<PublishResult>;
};

export type LinkFormatter = (url: string, label?: string) => string;
