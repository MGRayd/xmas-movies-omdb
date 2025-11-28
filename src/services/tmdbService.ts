import { Movie } from '../types/movie';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export interface TmdbPoster {
  url: string;
  iso_639_1: string | null;
  width: number;
  height: number;
  voteAverage: number;
  voteCount: number;
}

export const getMoviePostersFromTmdb = async (
  tmdbId: number,
  apiKey: string
): Promise<TmdbPoster[]> => {
  if (!apiKey) {
    throw new Error('TMDb API key is required.');
  }

  const url = `${TMDB_API_BASE}/movie/${tmdbId}/images?api_key=${encodeURIComponent(
    apiKey
  )}&include_image_language=en,null`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status}`);
  }

  const json = await response.json();
  const posters = (json.posters || []) as Array<{
    file_path: string;
    iso_639_1: string | null;
    width: number;
    height: number;
    vote_average: number;
    vote_count: number;
  }>;

  const filtered = posters.filter(
    (p) => !p.iso_639_1 || p.iso_639_1 === 'en'
  );

  filtered.sort((a, b) => b.vote_count - a.vote_count);

  return filtered.map((p) => ({
    url: `${TMDB_IMAGE_BASE}${p.file_path}`,
    iso_639_1: p.iso_639_1 ?? null,
    width: p.width,
    height: p.height,
    voteAverage: p.vote_average,
    voteCount: p.vote_count,
  }));
};
