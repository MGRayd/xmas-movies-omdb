// src/components/imports/LocalSearchPanel.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { TMDBMovie } from '../../types/movie';
import { posterSrc } from '../../utils/matching';

type LocalMovieLike = TMDBMovie & {
  source?: 'local';
  firestoreId?: string;
  cast?: string[];
  release_date?: string;
};

type SearchField = 'all' | 'title' | 'year' | 'cast';
type SortOption = 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc';

type Props = {
  onSelect: (movieLike: LocalMovieLike) => void;
  // Firestore movie doc IDs already in the user’s collection
  userMovieIds: string[];
};

const LocalSearchPanel: React.FC<Props> = ({ onSelect, userMovieIds }) => {
  const [allMovies, setAllMovies] = useState<LocalMovieLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [sortOption, setSortOption] = useState<SortOption>('title-asc');
  const [hideOwned, setHideOwned] = useState(false);

  // Load ALL catalogue movies once
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        const snap = await getDocs(collection(db, 'movies'));

        const mapped: LocalMovieLike[] = snap.docs
          .map((doc) => {
            const data: any = doc.data();
            if (!data.tmdbId) return null;

            return {
              id: data.tmdbId,
              title: data.title,
              release_date: data.releaseDate,
              poster_path: data.posterUrl?.startsWith('https://image.tmdb.org/t/p/')
                ? data.posterUrl.replace('https://image.tmdb.org/t/p/w500', '')
                : null,
              source: 'local' as const,
              firestoreId: doc.id,
              cast: data.cast || [],
              runtime: data.runtime,
              genres: data.genres || [],
              overview: data.overview,
            };
          })
          .filter(Boolean) as LocalMovieLike[];

        setAllMovies(mapped);
      } catch (e: any) {
        console.error('Error loading local catalogue:', e);
        setError(e?.message ?? 'Failed to load local catalogue');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Search logic (title / year / cast)
  const matchesSearch = useCallback(
    (movie: LocalMovieLike) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const tokens = query.split(',').map((t) => t.trim()).filter(Boolean);

      const inCast = (q: string) =>
        movie.cast && movie.cast.some((actor) => actor.toLowerCase().includes(q));

      switch (searchField) {
        case 'title':
          return movie.title.toLowerCase().includes(query);
        case 'year':
          return movie.release_date && movie.release_date.substring(0, 4).includes(query);
        case 'cast':
          return tokens.length ? tokens.some((t) => inCast(t)) : inCast(query);
        case 'all':
        default:
          return (
            movie.title.toLowerCase().includes(query) ||
            (movie.release_date && movie.release_date.substring(0, 4).includes(query)) ||
            (movie.cast && movie.cast.some((actor) => actor.toLowerCase().includes(query)))
          );
      }
    },
    [searchQuery, searchField]
  );

  const filteredMovies = useMemo(
    () =>
      allMovies.filter((m) => {
        if (!matchesSearch(m)) return false;

        const isOwned = !!m.firestoreId && userMovieIds.includes(m.firestoreId);
        if (hideOwned && isOwned) return false;

        return true;
      }),
    [allMovies, matchesSearch, userMovieIds, hideOwned]
  );

  // Sorting logic (title / year)
  const sortedMovies = useMemo(() => {
    const list = [...filteredMovies];

    const getYear = (m: LocalMovieLike) => {
      if (!m.release_date) return 0;
      const year = parseInt(m.release_date.slice(0, 4), 10);
      return Number.isNaN(year) ? 0 : year;
    };

    list.sort((a, b) => {
      switch (sortOption) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'year-desc': {
          const yA = getYear(a);
          const yB = getYear(b);
          return yB - yA || a.title.localeCompare(b.title);
        }
        case 'year-asc': {
          const yA = getYear(a);
          const yB = getYear(b);
          return yA - yB || a.title.localeCompare(b.title);
        }
        default:
          return 0;
      }
    });

    return list;
  }, [filteredMovies, sortOption]);

  return (
    <div className="space-y-4">
      {/* Search + field + sort */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Search + field selector */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              className="input input-bordered input-sm sm:input-md w-full pl-8 pr-8"
              placeholder="   Search catalogue by title, cast, year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-2 flex items-center"
                onClick={() => setSearchQuery('')}
              >
                <i className="fas fa-times text-gray-400 hover:text-gray-600"></i>
              </button>
            )}
          </div>

          <select
            className="select select-bordered select-sm sm:select-md w-full sm:w-40"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
          >
            <option value="all">All Fields</option>
            <option value="title">Title Only</option>
            <option value="year">Year Only</option>
            <option value="cast">Cast Only</option>
          </select>
        </div>

        {/* Sort selector */}
        <div className="flex items-center justify-end">
          <select
            className="select select-bordered select-sm sm:select-md w-full sm:w-52"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
          >
            <option value="title-asc">Sort: Title (A → Z)</option>
            <option value="title-desc">Sort: Title (Z → A)</option>
            <option value="year-desc">Sort: Year (Newest → Oldest)</option>
            <option value="year-asc">Sort: Year (Oldest → Newest)</option>
          </select>
        </div>
      </div>

      {/* Count / status */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center text-xs sm:text-sm gap-2">
        <div>
          {loading ? (
            <span>Loading catalogue…</span>
          ) : (
            <>
              <span className="font-medium">{sortedMovies.length}</span>{' '}
              {sortedMovies.length === 1 ? 'movie' : 'movies'} in catalogue
              {searchQuery && (
                <span className="ml-1 opacity-70">
                  for: <span className="font-medium">"{searchQuery}"</span>
                </span>
              )}
            </>
          )}
        </div>
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            className="checkbox checkbox-xs sm:checkbox-sm"
            checked={hideOwned}
            onChange={(e) => setHideOwned(e.target.checked)}
          />
          <span>Hide owned movies</span>
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex justify-center p-6">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!loading && sortedMovies.length === 0 && !error && (
        <div className="bg-xmas-card bg-opacity-60 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">No movies found</h3>
          <p className="text-sm opacity-80 mb-2">
            Try changing your search text, field, or sort order.
          </p>
        </div>
      )}

      {/* Poster grid – same breakpoints as MoviesPage */}
      {!loading && sortedMovies.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {sortedMovies.map((m) => {
            const isOwned = !!m.firestoreId && userMovieIds.includes(m.firestoreId);

            return (
              <div
                key={m.firestoreId || m.id}
                className={`block transition-transform hover:scale-[1.02] hover:shadow-xl ${
                  isOwned ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => !isOwned && onSelect(m)}
              >
                <div className="relative rounded-lg overflow-hidden bg-xmas-card shadow-md h-full flex flex-col">
                  {/* Poster */}
                  <div className="relative">
                    {posterSrc(m) ? (
                      <img
                        src={posterSrc(m)!}
                        alt={m.title}
                        className="w-full h-auto object-cover"
                        style={{ aspectRatio: '2/3' }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full flex items-center justify-center bg-gray-800"
                        style={{ aspectRatio: '2/3' }}
                      >
                        <i className="fas fa-film text-2xl text-gray-500" />
                      </div>
                    )}

                    {/* In collection badge */}
                    {isOwned && (
                      <div
                        className="
                          absolute top-1 left-1 
                          badge badge-success 
                          px-2 py-0.5 
                          text-[0.6rem] leading-none 
                          whitespace-nowrap 
                          flex items-center gap-1 
                          shadow
                        "
                      >
                        <i className="fas fa-check text-[0.6rem]" />
                        <span>Owned</span>
                      </div>
                    )}
                  </div>

                  {/* Title + year only */}
                  <div className="p-1 sm:p-2 flex-grow flex flex-col">
                    <h3 className="text-xs sm:text-sm font-medium line-clamp-2">
                      {m.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {m.release_date?.slice(0, 4)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocalSearchPanel;
