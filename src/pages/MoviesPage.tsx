import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createMovieUrl } from '../utils/urlUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { Movie, UserMovie } from '../types/movie';
import { getUserMoviesWithDetails } from '../utils/userMovieUtils';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../ui/ToastProvider';
import { getYearFromReleaseDate } from '../utils/dateUtils';

type SortOption = 'title' | 'year' | 'rating' | 'watched' | 'added';
type SearchField = 'title' | 'year' | 'cast' | 'all';

interface SortConfig {
  option: SortOption;
  direction: 'asc' | 'desc';
}

const MoviesPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [userMovies, setUserMovies] = useState<{[movieId: string]: UserMovie}>({});
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched' | 'favorites'>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ option: 'title', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPublicWatchlist, setIsPublicWatchlist] = useState(false);
  const [publicWatchlistName, setPublicWatchlistName] = useState('');
  const [publicWatchlistTagline, setPublicWatchlistTagline] = useState('');
  const [publicWatchlistSlug, setPublicWatchlistSlug] = useState('');
  const [sharingSaving, setSharingSaving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const slugify = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleGenerateSlugFromName = () => {
    if (!publicWatchlistName) return;
    const slug = slugify(publicWatchlistName);
    setPublicWatchlistSlug(slug);
  };

  const handleSaveSharing = async () => {
    if (!currentUser) return;

    try {
      setSharingSaving(true);

      const userRef = doc(db, 'users', currentUser.uid);

      const payload: any = {
        isPublicWatchlist,
        publicWatchlistName: publicWatchlistName || null,
        publicWatchlistTagline: publicWatchlistTagline || null,
        publicWatchlistSlug: publicWatchlistSlug || null,
      };

      if (isPublicWatchlist && !payload.publicWatchlistSlug) {
        const baseName = publicWatchlistName || userProfile?.displayName || 'xmas-watchlist';
        payload.publicWatchlistSlug = slugify(baseName);
        setPublicWatchlistSlug(payload.publicWatchlistSlug);
      }

      await updateDoc(userRef, payload);

      // Mirror safe public fields into publicProfiles collection
      if (isPublicWatchlist && payload.publicWatchlistSlug) {
        const publicRef = doc(db, 'publicProfiles', payload.publicWatchlistSlug);
        await setDoc(publicRef, {
          userId: currentUser.uid,
          displayName: userProfile?.displayName || '',
          photoURL: userProfile?.photoURL || null,
          publicWatchlistName: payload.publicWatchlistName || null,
          publicWatchlistTagline: payload.publicWatchlistTagline || null,
          publicWatchlistSlug: payload.publicWatchlistSlug,
          isPublicWatchlist: true,
        }, { merge: true });
      } else if (!isPublicWatchlist && publicWatchlistSlug) {
        // Ensure any existing public profile is marked as non-public
        const publicRef = doc(db, 'publicProfiles', publicWatchlistSlug);
        await setDoc(publicRef, {
          userId: currentUser.uid,
          isPublicWatchlist: false,
          publicWatchlistName: null,
          publicWatchlistTagline: null,
        }, { merge: true });
      }

      toast.success('Sharing settings saved');
    } catch (err) {
      console.error('Error saving sharing settings:', err);
      toast.error('Failed to save sharing settings');
    } finally {
      setSharingSaving(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!publicWatchlistSlug) return;
    try {
      const origin = window.location.origin;
      const url = `${origin}/u/${publicWatchlistSlug}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link', err);
      toast.error('Failed to copy link');
    }
  };
  
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const field = (params.get('field') as SearchField) || 'all';

  // only set if different to avoid loops
  if (q !== searchQuery) setSearchQuery(q);
  if (field !== searchField) setSearchField(field);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [location.search]);

  useEffect(() => {
    if (!userProfile) return;
    setIsPublicWatchlist(!!userProfile.isPublicWatchlist);
    setPublicWatchlistName(userProfile.publicWatchlistName || '');
    setPublicWatchlistTagline(userProfile.publicWatchlistTagline || '');
    setPublicWatchlistSlug(userProfile.publicWatchlistSlug || '');
  }, [userProfile]);

  useEffect(() => {
    if (!isPublicWatchlist) return;
    if (!publicWatchlistName) return;
    if (publicWatchlistSlug) return;
    setPublicWatchlistSlug(slugify(publicWatchlistName));
  }, [isPublicWatchlist, publicWatchlistName, publicWatchlistSlug]);

  // No pagination - show all movies at once
  useEffect(() => {
    const fetchMovies = async () => {
      if (!currentUser) return;
      
      try {
        setInitialLoading(true);
        
        // Use the utility function to get user movies with details
        const { userMovies: userMoviesMap, movies: moviesData } = await getUserMoviesWithDetails(currentUser.uid);
        
        setUserMovies(userMoviesMap);
        setMovies(moviesData);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError('Failed to load movies');
      } finally {
        setInitialLoading(false);
        setLoading(false);
      }
    };

    fetchMovies();
  }, [currentUser, location.key]);
  
  // No pagination reset needed

  // Handle sort change
  const handleSortChange = (option: SortOption) => {
    setSortConfig(prevConfig => {
      // If clicking the same option, toggle direction
      if (prevConfig.option === option) {
        return { option, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      // Otherwise, set new option with default ascending direction
      return { option, direction: 'asc' };
    });
  };

  // Search function
  const searchMovies = useCallback((movie: Movie) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const tokens = query.split(',').map(t => t.trim()).filter(Boolean);
    const inCast = (q: string) =>
      movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(q));

    const userMovie = userMovies[movie.id];
    
    switch (searchField) {
      case 'title':
        return movie.title.toLowerCase().includes(query) || 
               (movie.sortTitle && movie.sortTitle.toLowerCase().includes(query)) ||
               (movie.originalTitle && movie.originalTitle.toLowerCase().includes(query));
      case 'year':
        return !!movie.releaseDate && !!getYearFromReleaseDate(movie.releaseDate)?.includes(query);
      case 'cast':
        return tokens.length ? tokens.some(t => inCast(t)) : inCast(query);
      case 'all':
      default: {
        const year = movie.releaseDate && getYearFromReleaseDate(movie.releaseDate);
        // Search in multiple fields
        return (
          movie.title.toLowerCase().includes(query) || 
          (movie.sortTitle && movie.sortTitle.toLowerCase().includes(query)) ||
          (movie.originalTitle && movie.originalTitle.toLowerCase().includes(query)) ||
          (year && year.includes(query)) ||
          (movie.overview && movie.overview.toLowerCase().includes(query)) ||
          (movie.genres && movie.genres.some(genre => genre.toLowerCase().includes(query))) ||
          (movie.directors && movie.directors.some(director => director.toLowerCase().includes(query))) ||
          (movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(query))) ||
          (userMovie && userMovie.review && userMovie.review.toLowerCase().includes(query))
        );
      }
    }
  }, [searchQuery, searchField, userMovies]);

  // Filter and sort movies based on selected filter and search
  const filteredMovies = useMemo(() => {
    // Show loading state when applying filters
    if (initialLoading) return [];
    setLoading(true);
    
    const filtered = movies.filter(movie => {
      const userMovie = userMovies[movie.id];
      
      // First apply the category filter
      let passesFilter = true;
      switch (filter) {
        case 'watched':
          passesFilter = userMovie && userMovie.watched;
          break;
        case 'unwatched':
          passesFilter = !userMovie || !userMovie.watched;
          break;
        case 'favorites':
          passesFilter = userMovie && userMovie.favorite;
          break;
      }
      
      // Then apply the search filter
      return passesFilter && searchMovies(movie);
    }).sort((a, b) => {
      const userMovieA = userMovies[a.id];
      const userMovieB = userMovies[b.id];
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.option) {
        case 'title':
          // Use sortTitle if available, otherwise fall back to title
          const titleA = a.sortTitle || a.title;
          const titleB = b.sortTitle || b.title;
          return titleA.localeCompare(titleB) * direction;
        
        case 'year': {
          const yearStrA = a.releaseDate && getYearFromReleaseDate(a.releaseDate);
          const yearStrB = b.releaseDate && getYearFromReleaseDate(b.releaseDate);
          const yearA = yearStrA ? parseInt(yearStrA, 10) : 0;
          const yearB = yearStrB ? parseInt(yearStrB, 10) : 0;
          return (yearA - yearB) * direction;
        }
        
        case 'rating':
          const ratingA = userMovieA?.rating || 0;
          const ratingB = userMovieB?.rating || 0;
          return (ratingA - ratingB) * direction;
        
        case 'watched':
          const watchedA = userMovieA?.watched ? 1 : 0;
          const watchedB = userMovieB?.watched ? 1 : 0;
          return (watchedA - watchedB) * direction;
        
        default:
          return 0;
      }
    });
    
    setLoading(false);
    return filtered;
  }, [movies, userMovies, filter, sortConfig, searchQuery, searchField, initialLoading]);
  
  // Use all filtered movies
  const currentMovies = filteredMovies;

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 gap-3">
        <h1 className="font-christmas text-2xl sm:text-3xl md:text-4xl text-xmas-line">My Christmas Movies</h1>
        <div className="flex gap-2 w-full sm:w-auto justify-center">
          <Link to="/random" className="btn btn-primary btn-sm sm:btn-md">
            <i className="fas fa-random mr-1 sm:mr-2"></i> <span className="hidden xs:inline">Random Movie</span><span className="xs:hidden">Random</span>
          </Link>
          <Link to="/import" className="btn btn-primary btn-sm sm:btn-md">
            <i className="fas fa-file-import mr-1 sm:mr-2"></i> <span className="hidden xs:inline">Add Movies</span><span className="xs:hidden">Import</span>
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm sm:btn-md"
            onClick={() => setShowShareModal(true)}
          >
            <i className="fas fa-share-alt mr-1 sm:mr-2"></i>
            <span className="hidden xs:inline">Share</span>
            <span className="xs:hidden">Share</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            className="input input-bordered input-sm sm:input-md w-full pl-8 pr-8"
            placeholder="   Search movies..."
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
          className="select select-bordered select-sm sm:select-md w-full sm:w-36"
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
        >
          <option value="all">All Fields</option>
          <option value="title">Title Only</option>
          <option value="year">Year Only</option>
          <option value="cast">Cast Only</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div className="tabs tabs-boxed mb-3 text-xs sm:text-sm overflow-x-auto">
        <button 
          className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Movies
        </button>
        <button 
          className={`tab ${filter === 'watched' ? 'tab-active' : ''}`}
          onClick={() => setFilter('watched')}
        >
          Watched
        </button>
        <button 
          className={`tab ${filter === 'unwatched' ? 'tab-active' : ''}`}
          onClick={() => setFilter('unwatched')}
        >
          Watch
        </button>
        <button 
          className={`tab ${filter === 'favorites' ? 'tab-active' : ''}`}
          onClick={() => setFilter('favorites')}
        >
          <span className="hidden sm:inline">Favourites</span>
          <span className="sm:hidden">Favs</span>
        </button>
      </div>
      
      {/* Sort options */}
      <div className="flex flex-wrap items-center gap-1 mb-3 bg-xmas-card bg-opacity-50 p-2 rounded-lg overflow-x-auto">
        <span className="text-xs sm:text-sm font-medium mr-1">Sort:</span>
        <div className="flex flex-nowrap gap-1 overflow-x-auto">
          <button 
            className={`btn btn-xs ${sortConfig.option === 'title' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleSortChange('title')}
          >
            Title {sortConfig.option === 'title' && (
              <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>
            )}
          </button>
          <button 
            className={`btn btn-xs ${sortConfig.option === 'year' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleSortChange('year')}
          >
            Year {sortConfig.option === 'year' && (
              <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>
            )}
          </button>
          <button 
            className={`btn btn-xs ${sortConfig.option === 'rating' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleSortChange('rating')}
          >
            Rating {sortConfig.option === 'rating' && (
              <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>
            )}
          </button>
          <button 
            className={`btn btn-xs ${sortConfig.option === 'watched' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleSortChange('watched')}
          >
            <span className="hidden sm:inline">Watched Status</span>
            <span className="sm:hidden">Watched</span>
            {sortConfig.option === 'watched' && (
              <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>
            )}
          </button>
        </div>
      </div>
      
      {/* Movie count */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-3 text-xs sm:text-sm">
        <div>
          <span className="font-medium">{filteredMovies.length}</span> {filteredMovies.length === 1 ? 'movie' : 'movies'} found
          {searchQuery && (
            <span className="ml-1 text-xmas-mute">
              for: <span className="font-medium">"{searchQuery}"</span>
            </span>
          )}
        </div>
        {sortConfig.option && (
          <div className="text-xmas-mute">
            Sorted by <span className="font-medium">{sortConfig.option}</span> ({sortConfig.direction === 'asc' ? 'asc' : 'desc'})
          </div>
        )}
      </div>
      
      {/* Loading indicator for filter/sort operations */}
      {loading && !initialLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-xmas-gold"></div>
        </div>
      )}
      
      {filteredMovies.length === 0 ? (
        <div className="bg-xmas-card p-8 rounded-lg text-center">
          <h3 className="text-xl mb-4">No movies found</h3>
          <p className="mb-4">
            {filter === 'all' 
              ? "You haven't added any Christmas movies yet." 
              : `You don't have any ${filter} Christmas movies.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/import" className="btn btn-primary">
              <i className="fas fa-file-import mr-2"></i> Add Movies
            </Link>
            {movies.length > 0 && (
              <Link to="/random" className="btn btn-primary">
                <i className="fas fa-random mr-2"></i> Random Movie
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {currentMovies.map((movie) => {
            const userMovie = userMovies[movie.id];
            return (
              <Link 
                key={movie.id}
                to={createMovieUrl(movie.title, movie.id)}
                state={{ from: 'movies' }}
                className="block transition-transform hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="relative rounded-lg overflow-hidden bg-xmas-card shadow-md h-full flex flex-col">
                  {/* Poster */}
                  <div className="relative">
                    {movie.posterUrl ? (
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title} 
                        className="w-full h-auto object-cover"
                        style={{ aspectRatio: '2/3' }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full flex items-center justify-center bg-gray-800" style={{ aspectRatio: '2/3' }}>
                        <i className="fas fa-film text-2xl text-gray-500"></i>
                      </div>
                    )}
                    
                    {/* Watched indicator (checkmark in corner like Emby) */}
                    {userMovie && userMovie.watched && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-1 shadow-md">
                        <i className="fas fa-check text-xs text-white"></i>
                      </div>
                    )}
                    
                    {/* Favorite indicator */}
                    {userMovie && userMovie.favorite && (
                      <div className="absolute top-1 left-1 text-yellow-400 drop-shadow-md">
                        <i className="fas fa-star text-sm"></i>
                      </div>
                    )}
                  </div>
                  
                  {/* Title and year - simplified for mobile */}
                  <div className="p-1 sm:p-2 flex-grow flex flex-col">
                    <h3 className="text-xs sm:text-sm font-medium line-clamp-2">{movie.title}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-400">{movie.releaseDate && getYearFromReleaseDate(movie.releaseDate)}</p>
                      {userMovie && userMovie.rating && (
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-0.5">
                            <i className="fas fa-star text-xs"></i>
                          </span>
                          <span className="text-xs">{userMovie.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      
      {showShareModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-2">Share your watchlist</h3>
            <p className="text-sm mb-4">
              Create a shareable page that shows your watched Christmas movies, ratings and vibes.
            </p>

            <div className="form-control mb-4">
              <label className="label cursor-pointer">
                <span className="label-text">Make my watchlist public</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={isPublicWatchlist}
                  onChange={(e) => setIsPublicWatchlist(e.target.checked)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Public display name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm sm:input-md"
                  value={publicWatchlistName}
                  onChange={(e) => setPublicWatchlistName(e.target.value)}
                  placeholder="My Xmas Movies"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tagline / bio (optional)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm sm:input-md"
                  value={publicWatchlistTagline}
                  onChange={(e) => setPublicWatchlistTagline(e.target.value)}
                  placeholder="Only the coziest Xmas movies allowed"
                />
              </div>

              {publicWatchlistSlug && (
                <div className="mt-1 text-xs text-xmas-mute">
                  Your public link: <span className="font-mono">/u/{publicWatchlistSlug}</span>
                </div>
              )}
            </div>

            <div className="modal-action flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveSharing}
                  disabled={sharingSaving}
                >
                  {sharingSaving && (
                    <span className="loading loading-spinner loading-xs mr-1"></span>
                  )}
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleCopyShareLink}
                  disabled={!publicWatchlistSlug}
                >
                  <i className="fas fa-link mr-2"></i>
                  Copy link
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowShareModal(false)}
              >
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setShowShareModal(false)}>
            <button>close</button>
          </form>
        </dialog>
      )}
      
      {/* No pagination - all movies shown at once */}
    </div>
  );
};

export default MoviesPage;
