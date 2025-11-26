import { OmdbMovie } from '../types/movie';
import { generateSortTitle } from '../utils/titleUtils';

const OMDB_API_BASE = 'https://www.omdbapi.com/';

/* ---------------------------  Normalization helpers  --------------------------- */

export const normalizeTitle = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const makeKeywords = (omdbMovie: OmdbMovie): string[] => {
  const tokens = new Set<string>();
  const push = (txt?: string) => {
    const norm = normalizeTitle(txt || '');
    if (!norm) return;
    tokens.add(norm);
    norm.split(' ').forEach(w => w && tokens.add(w));
  };

  push(omdbMovie.Title);
  if (omdbMovie.Year) tokens.add(omdbMovie.Year);
  if (omdbMovie.Genre) omdbMovie.Genre.split(',').forEach(g => push(g));
  if (omdbMovie.Actors) omdbMovie.Actors.split(',').forEach(a => push(a));
  if (omdbMovie.Director) omdbMovie.Director.split(',').forEach(d => push(d));

  return Array.from(tokens).slice(0, 200);
};

/* ---------------------------  OMDb API functions  --------------------------- */

export interface OmdbSearchResult {
  Search?: OmdbMovie[];
  totalResults?: string;
  Response: 'True' | 'False';
  Error?: string;
}

export const searchMoviesOmdb = async (
  query: string,
  apiKey: string
): Promise<OmdbMovie[]> => {
  const url = `${OMDB_API_BASE}?apikey=${apiKey}&s=${encodeURIComponent(query)}&type=movie`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OMDb API error: ${response.status}`);
  const json: OmdbSearchResult = await response.json();
  if (json.Response === 'False' || !json.Search) {
    throw new Error(json.Error || 'No results from OMDb');
  }
  return json.Search;
};

export const getMovieDetailsOmdb = async (
  imdbId: string,
  apiKey: string
): Promise<OmdbMovie> => {
  const url = `${OMDB_API_BASE}?apikey=${apiKey}&i=${encodeURIComponent(imdbId)}&plot=full`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OMDb API error: ${response.status}`);
  const json = (await response.json()) as OmdbMovie & { Response?: string; Error?: string };
  if ((json as any).Response === 'False') {
    throw new Error((json as any).Error || 'Failed to fetch OMDb details');
  }
  return json;
};

/* ---------------------------  Formatter  --------------------------- */

export const formatOmdbMovie = (omdbMovie: OmdbMovie) => {
  const title = omdbMovie.Title;
  const sortTitle = generateSortTitle(title);
  const sortTitleLower = normalizeTitle(sortTitle);

  const year = omdbMovie.Year;
  const releaseDate = omdbMovie.Released && omdbMovie.Released !== 'N/A'
    ? omdbMovie.Released
    : year && year !== 'N/A'
      ? `${year}-01-01`
      : null;

  const runtimeMinutes = omdbMovie.Runtime && omdbMovie.Runtime !== 'N/A'
    ? parseInt(omdbMovie.Runtime, 10)
    : null;

  const genres = omdbMovie.Genre && omdbMovie.Genre !== 'N/A'
    ? omdbMovie.Genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  const directors = omdbMovie.Director && omdbMovie.Director !== 'N/A'
    ? omdbMovie.Director.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  const cast = omdbMovie.Actors && omdbMovie.Actors !== 'N/A'
    ? omdbMovie.Actors.split(',').map(a => a.trim()).filter(Boolean)
    : [];

  const overview = omdbMovie.Plot && omdbMovie.Plot !== 'N/A' ? omdbMovie.Plot : null;

  return {
    imdbId: omdbMovie.imdbID,
    title,
    sortTitle,
    sortTitleLower,
    originalTitle: title,
    releaseDate,
    posterUrl: omdbMovie.Poster && omdbMovie.Poster !== 'N/A' ? omdbMovie.Poster : null,
    backdropUrl: null,
    overview,
    runtime: runtimeMinutes,
    genres,
    directors,
    cast,
    isChristmas: true,
    keywords: makeKeywords(omdbMovie),
    updatedAt: new Date(),
  };
};
