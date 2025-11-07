import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Movie, UserMovie } from '../types/movie';
import { getUserMoviesWithDetails } from '../utils/userMovieUtils';

type SortOption = 'title' | 'year' | 'rating' | 'watched' | 'added';
type SearchField = 'title' | 'year' | 'all';

interface SortConfig {
  option: SortOption;
  direction: 'asc' | 'desc';
}

const MoviesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [userMovies, setUserMovies] = useState<{[movieId: string]: UserMovie}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched' | 'favorites'>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ option: 'title', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchField, setSearchField] = useState<SearchField>('all');

  useEffect(() => {
    const fetchMovies = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Use the utility function to get user movies with details
        const { userMovies: userMoviesMap, movies: moviesData } = await getUserMoviesWithDetails(currentUser.uid);
        
        setUserMovies(userMoviesMap);
        setMovies(moviesData);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError('Failed to load movies');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [currentUser]);

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
    const userMovie = userMovies[movie.id];
    
    switch (searchField) {
      case 'title':
        return movie.title.toLowerCase().includes(query) || 
               (movie.originalTitle && movie.originalTitle.toLowerCase().includes(query));
      case 'year':
        return movie.releaseDate && movie.releaseDate.substring(0, 4).includes(query);
      case 'all':
      default:
        // Search in multiple fields
        return (
          movie.title.toLowerCase().includes(query) || 
          (movie.originalTitle && movie.originalTitle.toLowerCase().includes(query)) ||
          (movie.releaseDate && movie.releaseDate.substring(0, 4).includes(query)) ||
          (movie.overview && movie.overview.toLowerCase().includes(query)) ||
          (movie.genres && movie.genres.some(genre => genre.toLowerCase().includes(query))) ||
          (movie.directors && movie.directors.some(director => director.toLowerCase().includes(query))) ||
          (movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(query))) ||
          (userMovie && userMovie.review && userMovie.review.toLowerCase().includes(query))
        );
    }
  }, [searchQuery, searchField, userMovies]);

  // Filter movies based on selected filter and search
  const filteredMovies = movies.filter(movie => {
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
        return a.title.localeCompare(b.title) * direction;
      
      case 'year':
        const yearA = a.releaseDate ? parseInt(a.releaseDate.substring(0, 4)) : 0;
        const yearB = b.releaseDate ? parseInt(b.releaseDate.substring(0, 4)) : 0;
        return (yearA - yearB) * direction;
      
      case 'rating':
        const ratingA = userMovieA?.rating || 0;
        const ratingB = userMovieB?.rating || 0;
        return (ratingA - ratingB) * direction;
      
      case 'watched':
        const watchedA = userMovieA?.watched ? 1 : 0;
        const watchedB = userMovieB?.watched ? 1 : 0;
        return (watchedA - watchedB) * direction;
      
      case 'added':
        const addedAtA = userMovieA?.addedAt ? userMovieA.addedAt.getTime() : 0;
        const addedAtB = userMovieB?.addedAt ? userMovieB.addedAt.getTime() : 0;
        return (addedAtA - addedAtB) * direction;
      
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">My Christmas Movies</h1>
        <div className="flex gap-2">
          <Link to="/random" className="btn btn-primary">
            <i className="fas fa-random mr-2"></i> Random Movie
          </Link>
          <Link to="/import" className="btn btn-primary">
            <i className="fas fa-file-import mr-2"></i> Import Movies
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {/* Search bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            className="input input-bordered w-full pl-10 pr-16"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setSearchQuery('')}
            >
              <i className="fas fa-times text-gray-400 hover:text-gray-600"></i>
            </button>
          )}
        </div>
        <select
          className="select select-bordered w-full md:w-48"
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
        >
          <option value="all">All Fields</option>
          <option value="title">Title Only</option>
          <option value="year">Year Only</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div className="tabs tabs-boxed mb-4">
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
          Unwatched
        </button>
        <button 
          className={`tab ${filter === 'favorites' ? 'tab-active' : ''}`}
          onClick={() => setFilter('favorites')}
        >
          Favorites
        </button>
      </div>
      
      {/* Sort options */}
      <div className="flex flex-wrap items-center gap-2 mb-6 bg-xmas-card bg-opacity-50 p-3 rounded-lg">
        <span className="text-sm font-medium mr-2">Sort by:</span>
        <div className="flex flex-wrap gap-2">
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
            Watched Status {sortConfig.option === 'watched' && (
              <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>
            )}
          </button>
          <button 
            className={`btn btn-xs ${sortConfig.option === 'added' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleSortChange('added')}
          >
            Date Added {sortConfig.option === 'added' && (
              <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`}></i>
            )}
          </button>
        </div>
      </div>
      
      {/* Movie count */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm">
          <span className="font-medium">{filteredMovies.length}</span> {filteredMovies.length === 1 ? 'movie' : 'movies'} found
          {searchQuery && (
            <span className="ml-2 text-xmas-mute">
              for search: <span className="font-medium">"{searchQuery}"</span>
            </span>
          )}
        </div>
        {sortConfig.option && (
          <div className="text-sm text-xmas-mute">
            Sorted by <span className="font-medium">{sortConfig.option}</span> ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})
          </div>
        )}
      </div>
      
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
              <i className="fas fa-file-import mr-2"></i> Import Movies
            </Link>
            {movies.length > 0 && (
              <Link to="/random" className="btn btn-primary">
                <i className="fas fa-random mr-2"></i> Random Movie
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => {
            const userMovie = userMovies[movie.id];
            return (
              <Link 
                key={movie.id}
                to={`/movies/${movie.id}`}
                className="block transition-transform hover:scale-[1.02] hover:shadow-2xl"
              >
                <div className="card bg-xmas-card shadow-xl h-full">
                  <figure className="relative">
                    {movie.posterUrl ? (
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title} 
                        className="w-full object-contain"
                        style={{ aspectRatio: '2/3' }}
                      />
                    ) : (
                      <div className="w-full flex items-center justify-center bg-gray-800" style={{ aspectRatio: '2/3' }}>
                        <i className="fas fa-film text-4xl text-gray-500"></i>
                      </div>
                    )}
                    
                    {/* Watched badge */}
                    {userMovie && userMovie.watched && (
                      <div className="absolute top-2 left-2 badge badge-success">Watched</div>
                    )}
                    
                    {/* Favorite badge */}
                    {userMovie && userMovie.favorite && (
                      <div className="absolute top-2 right-2 text-yellow-400">
                        <i className="fas fa-star"></i>
                      </div>
                    )}
                  </figure>
                  <div className="card-body">
                    <h2 className="card-title font-christmas">{movie.title}</h2>
                    <p className="text-sm text-gray-400">{movie.releaseDate?.substring(0, 4)}</p>
                    
                    {/* Rating */}
                    {userMovie && userMovie.rating && (
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-400 mr-1">
                          <i className="fas fa-star"></i>
                        </span>
                        <span>{userMovie.rating}/10</span>
                      </div>
                    )}
                    
                    <div className="card-actions justify-end mt-4">
                      <span className="btn btn-primary btn-sm">
                        View Details
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MoviesPage;
