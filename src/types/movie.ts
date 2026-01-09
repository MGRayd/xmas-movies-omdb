// Movie Types

export interface Movie {
  id: string;
  imdbId?: string;
  tmdbId?: number;
  title: string;
  sortTitle?: string; // Title without articles for sorting
  originalTitle?: string;
  releaseDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  runtime?: number;
  genres?: string[];
  directors?: string[];
  cast?: string[];
  isChristmas: boolean;
  addedAt: Date;
  updatedAt: Date;
  // Optional cache timestamp for external artwork lookups (e.g. fanart.tv)
  lastFanartFetchAt?: Date;
  // Optional cached list of poster URLs fetched from fanart.tv
  fanartPosters?: string[];
}

export interface UserMovie {
  id: string;
  userId: string;
  movieId: string;
  watched: boolean;
  watchedDate?: Date;
  lastWatchedDate?: Date;
  rewatchCount?: number;
  rating?: number; // 1-10
  review?: string;
  favorite: boolean;
  addedAt: Date;
  updatedAt: Date;
  vibeTags?: string[];
  // Optional reference to a poster in movies/{movieId}/posters/{posterId}
  posterId?: string;
  // Optional direct URL override for this user's chosen poster
  posterUrlOverride?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  omdbApiKey?: string;
  // Per-user fanart.tv API key used to fetch alternative artwork
  fanartApiKey?: string;
  // Admin-only TMDb API key used for catalogue poster management
  tmdbApiKey?: string;
  isPublicWatchlist?: boolean;
  publicWatchlistName?: string;
  publicWatchlistTagline?: string;
  publicWatchlistSlug?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface MovieList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  movieIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OmdbMovie {
  imdbID: string;
  Title: string;
  Year: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Actors?: string;
  Plot?: string;
  Poster?: string;
}

export interface ExcelMovieImport {
  title: string;
  releaseDate?: string;
  imdbId?: string;
  tmdbId?: number | string;
  watched?: boolean;
  rating?: number;
  review?: string;
}
