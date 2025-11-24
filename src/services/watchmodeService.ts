import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie } from '../types/movie';
import { CachedWatchmodeSources, WatchmodeSource, WatchmodeSourceMeta, WatchmodeSourceMetaMap } from '../types/watchmode';

const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1';
const REGIONS = ['GB', 'US', 'CA'] as const;
const PRIMARY_REGION = 'GB';
// 24 hours cache TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const API_KEY = import.meta.env.VITE_WATCHMODE_API_KEY as string | undefined;

// In-memory cache for /sources metadata
let sourcesMetaCache: WatchmodeSourceMetaMap | null = null;

if (typeof window !== 'undefined' && !API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('VITE_WATCHMODE_API_KEY is not set. Watchmode lookups will be disabled.');
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Watchmode API error ${res.status}`);
  }
  return (await res.json()) as T;
}

async function lookupWatchmodeTitleId(movie: Movie): Promise<number | null> {
  if (!API_KEY) return null;
  // Use name + optional year search – simpler and avoids 400s from tmdb_id queries
  try {
    const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined;
    const params = new URLSearchParams({
      apiKey: API_KEY!,
      search_field: 'name',
      search_value: movie.title,
    });
    const url = `${WATCHMODE_BASE_URL}/search/?${params.toString()}`;
    const data = await fetchJson<{ title_results: { id: number; year?: number }[] }>(url);
    if (!data.title_results?.length) return null;

    if (year) {
      const exactYear = data.title_results.find((t) => t.year === year);
      if (exactYear) return exactYear.id;
    }

    return data.title_results[0].id;
  } catch (err) {
    console.error('Watchmode name search failed', err);
    return null;
  }
}

async function fetchSourcesFromWatchmode(watchmodeTitleId: number): Promise<WatchmodeSource[]> {
  if (!API_KEY) return [];
  const params = new URLSearchParams({
    apiKey: API_KEY,
    regions: REGIONS.join(','),
  });
  const url = `${WATCHMODE_BASE_URL}/title/${watchmodeTitleId}/sources/?${params.toString()}`;
  const data = await fetchJson<WatchmodeSource[]>(url);

  // Keep only entries from our allowed regions and with a name
  const regionSet = new Set(REGIONS.map((r) => r.toUpperCase()));
  return data.filter((s) => regionSet.has((s.region || '').toUpperCase()) && !!s.name);
}

export async function getWatchmodeSourcesMeta(): Promise<WatchmodeSourceMetaMap | null> {
  if (!API_KEY) return null;
  if (sourcesMetaCache) return sourcesMetaCache;

  try {
    const url = `${WATCHMODE_BASE_URL}/sources/?apiKey=${API_KEY}`;
    const data = await fetchJson<WatchmodeSourceMeta[]>(url);
    const map: WatchmodeSourceMetaMap = {};
    for (const s of data) {
      map[s.id] = s;
    }
    sourcesMetaCache = map;
    return map;
  } catch (err) {
    console.error('Failed to load Watchmode source metadata', err);
    return null;
  }
}

export async function getWatchmodeSourcesForMovie(movie: Movie): Promise<CachedWatchmodeSources | null> {
  if (!movie?.id) return null;

  const cacheRef = doc(collection(db, 'watchmodeSources'), movie.id);

  try {
    const snap = await getDoc(cacheRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      const updatedAt: Date = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
      const isFresh = Date.now() - updatedAt.getTime() < CACHE_TTL_MS;
      const hasValidSources = Array.isArray(data.sources) && data.sources.length > 0;

      if (isFresh && hasValidSources) {
        return {
          movieId: movie.id,
          region: data.region || PRIMARY_REGION,
          watchmodeTitleId: data.watchmodeTitleId ?? undefined,
          sources: (data.sources || []) as WatchmodeSource[],
          updatedAt,
          errorCode: data.errorCode ?? null,
        };
      }
    }
  } catch (err) {
    console.error('Error reading Watchmode cache', err);
  }

  // Need to (re)fetch
  const watchmodeTitleId = await lookupWatchmodeTitleId(movie);
  let sources: WatchmodeSource[] = [];
  let errorCode: string | null = null;

  if (watchmodeTitleId) {
    try {
      sources = await fetchSourcesFromWatchmode(watchmodeTitleId);
    } catch (err) {
      console.error('Error fetching Watchmode sources', err);
      errorCode = 'sources_fetch_failed';
    }
  } else {
    errorCode = 'title_not_found';
  }

  // Strip deeplink placeholders from free plan responses before caching
  const sanitizedSources: WatchmodeSource[] = sources.map(({ ios_url, android_url, ...rest }) => rest);

  const payload = {
    movieId: movie.id,
    region: PRIMARY_REGION,
    watchmodeTitleId: watchmodeTitleId || null,
    sources: sanitizedSources,
    updatedAt: new Date(),
    errorCode,
  };

  // Best-effort cache write – if rules block it, just log and still return data
  try {
    await setDoc(cacheRef, payload, { merge: true });
  } catch (err) {
    console.error('Error updating Watchmode cache', err);
  }

  return {
    movieId: payload.movieId,
    region: payload.region,
    watchmodeTitleId: watchmodeTitleId || undefined,
    sources: sanitizedSources,
    updatedAt: payload.updatedAt,
    errorCode,
  };
}
