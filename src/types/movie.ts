// Movie Types

export interface Movie {
  id: string;
  imdbId?: string;
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
}

export interface UserMovie {
  id: string;
  userId: string;
  movieId: string;
  watched: boolean;
  watchedDate?: Date;
  rating?: number; // 1-10
  review?: string;
  favorite: boolean;
  addedAt: Date;
  updatedAt: Date;
  vibeTags?: string[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  omdbApiKey?: string;
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
  watched?: boolean;
  rating?: number;
  review?: string;
}
