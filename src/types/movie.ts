// Movie Types

export interface Movie {
  id: string;
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
  tmdbApiKey?: string;
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

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  credits?: {
    cast: { id: number; name: string; character: string }[];
    crew: { id: number; name: string; job: string }[];
  };
}

export interface ExcelMovieImport {
  title: string;
  releaseDate?: string;
  watched?: boolean;
  rating?: number;
  review?: string;
}
