import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Movie } from '../types/movie';

// How long to reuse cached fanart results (ms)
const FANART_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface FanartPosterResult {
  url: string;
}

type FanartProxyPayload = {
  imdbId?: string;
  tmdbId?: number;
  apiKey: string;
};

type FanartProxyResponse = {
  posters: string[];
};

export const getFanartPostersForMovie = async (
  movieId: string,
  movie: Movie,
  fanartApiKey?: string | null
): Promise<FanartPosterResult[]> => {
  // If we already have cached posters and they are fresh enough, reuse them.
  // Only treat the cache as valid when there is at least one poster; otherwise,
  // allow re-fetching so movies that previously returned no images can try again
  // (for example, after a tmdbId has been added).
  if (movie.fanartPosters && movie.fanartPosters.length > 0 && movie.lastFanartFetchAt) {
    const last = movie.lastFanartFetchAt instanceof Date
      ? movie.lastFanartFetchAt
      : new Date((movie.lastFanartFetchAt as any).seconds * 1000);
    if (Date.now() - last.getTime() < FANART_CACHE_MS) {
      return movie.fanartPosters.map((url) => ({ url }));
    }
  }

  const hasAnyId = !!movie.imdbId || (movie as any).tmdbId != null;

  if (!fanartApiKey || !hasAnyId) {
    // Cannot call fanart.tv without an API key or a usable id; fall back to any cached data
    return (movie.fanartPosters || []).map((url) => ({ url }));
  }

  try {
    const callable = httpsCallable<FanartProxyPayload, FanartProxyResponse>(
      functions,
      'fanartProxy'
    );

    const rawTmdbId: any = (movie as any).tmdbId;
    const tmdbId =
      typeof rawTmdbId === 'number'
        ? rawTmdbId
        : typeof rawTmdbId === 'string' && rawTmdbId.trim()
        ? Number(rawTmdbId)
        : undefined;

    const result = await callable({
      imdbId: movie.imdbId,
      tmdbId,
      apiKey: fanartApiKey,
    });
    const posters = Array.isArray(result.data.posters) ? result.data.posters : [];

    const unique = Array.from(new Set(posters.filter((u) => typeof u === 'string' && u))); // de-dupe & filter

    // Persist cache on the movie document
    try {
      const ref = doc(db, 'movies', movieId);
      await updateDoc(ref, {
        fanartPosters: unique,
        lastFanartFetchAt: new Date(),
      });
    } catch (e) {
      console.error('Failed to cache fanart posters on movie doc', e);
    }

    return unique.map((url) => ({ url }));
  } catch (err) {
    console.error('fanartProxy callable failed', err);
    return (movie.fanartPosters || []).map((url) => ({ url }));
  }
};
