export interface WatchmodeSource {
  source_id: number;
  name: string;
  type: string; // subscription, purchase, free, rent, etc.
  format: string | null;
  web_url: string | null;
  ios_url?: string | null;
  android_url?: string | null;
  region: string;
}

export interface WatchmodeSourcesResponse extends Array<WatchmodeSource> {}

// Metadata from the /sources endpoint (logos, etc.)
export interface WatchmodeSourceMeta {
  id: number;
  name: string;
  logo_100px?: string | null;
  logo_100px_dark?: string | null;
  // There are more fields on this endpoint; we only keep what we need for display.
}

export type WatchmodeSourceMetaMap = Record<number, WatchmodeSourceMeta>;

export interface CachedWatchmodeSources {
  movieId: string;
  region: string; // e.g. 'GB'
  watchmodeTitleId?: number;
  sources: WatchmodeSource[];
  updatedAt: Date;
  errorCode?: string | null;
}
