import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Movie, UserMovie } from '../types/movie';
import { getUserMoviesWithDetails } from '../utils/userMovieUtils';

const RandomMoviePage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [userMovies, setUserMovies] = useState<{[movieId: string]: UserMovie}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [randomMovie, setRandomMovie] = useState<Movie | null>(null);
  const [showWatched, setShowWatched] = useState(false);
  const [spinning, setSpinning] = useState(false);
  
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

  const pickRandomMovie = () => {
    if (movies.length === 0) return;
    
    setSpinning(true);
    setRandomMovie(null);
    
    // Filter movies based on watched status
    const eligibleMovies = movies.filter(movie => {
      const userMovie = userMovies[movie.id];
      return showWatched || !userMovie || !userMovie.watched;
    });
    
    if (eligibleMovies.length === 0) {
      setError('No eligible movies found. Try including watched movies.');
      setSpinning(false);
      return;
    }
    
    // Create a spinning effect
    let counter = 0;
    const totalSpins = 20;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligibleMovies.length);
      setRandomMovie(eligibleMovies[randomIndex]);
      
      counter++;
      if (counter >= totalSpins) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link to="/movies" className="btn btn-ghost">
          <i className="fas fa-arrow-left mr-2"></i> Back to Movies
        </Link>
      </div>
      
      <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line mb-6">Christmas Movie Picker</h1>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {movies.length === 0 ? (
        <div className="bg-xmas-card p-8 rounded-lg text-center">
          <h3 className="text-xl mb-4">No movies in your collection</h3>
          <p className="mb-4">Add some Christmas movies to use the random movie picker!</p>
          <Link to="/import" className="btn btn-primary">
            <i className="fas fa-file-import mr-2"></i> Import Movies
          </Link>
        </div>
      ) : (
        <div className="bg-xmas-card p-8 rounded-lg shadow-lg">
          <div className="text-center mb-6">
            <p className="mb-4">Can't decide what Christmas movie to watch? Let us pick one for you!</p>
            
            <div className="form-control mb-6">
              <label className="label cursor-pointer justify-center">
                <span className="label-text mr-2">Include watched movies</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={showWatched}
                  onChange={() => setShowWatched(!showWatched)}
                />
              </label>
            </div>
            
            <button 
              className="btn btn-primary btn-lg"
              onClick={pickRandomMovie}
              disabled={spinning}
            >
              {spinning ? (
                <>
                  <span className="loading loading-spinner loading-md mr-2"></span>
                  Picking a movie...
                </>
              ) : (
                <>
                  <i className="fas fa-random mr-2"></i>
                  Pick a Random Movie
                </>
              )}
            </button>
          </div>
          
          {randomMovie && (
            <div className="mt-8 flex flex-col items-center">
              <div className="w-full max-w-md">
                <div className="card bg-base-100 shadow-xl overflow-hidden">
                  <figure className="relative">
                    {randomMovie.posterUrl ? (
                      <img 
                        src={randomMovie.posterUrl} 
                        alt={randomMovie.title} 
                        className="w-full object-contain"
                        style={{ aspectRatio: '2/3', maxHeight: '500px' }}
                      />
                    ) : (
                      <div className="w-full flex items-center justify-center bg-gray-800" style={{ aspectRatio: '2/3', maxHeight: '500px' }}>
                        <i className="fas fa-film text-6xl text-gray-500"></i>
                      </div>
                    )}
                    
                    {/* Watched badge */}
                    {userMovies[randomMovie.id]?.watched && (
                      <div className="absolute top-4 left-4 badge badge-lg badge-success">Already Watched</div>
                    )}
                    
                    {/* Rating */}
                    {userMovies[randomMovie.id]?.rating && (
                      <div className="absolute top-4 right-4 badge badge-lg badge-warning">
                        <i className="fas fa-star mr-1"></i>
                        {userMovies[randomMovie.id].rating}/10
                      </div>
                    )}
                  </figure>
                  <div className="card-body">
                    <h2 className="card-title text-2xl font-christmas">{randomMovie.title}</h2>
                    <p className="text-gray-400">{randomMovie.releaseDate?.substring(0, 4)}</p>
                    
                    {randomMovie.overview && (
                      <p className="mt-2">{randomMovie.overview}</p>
                    )}
                    
                    <div className="card-actions justify-end mt-4">
                      <Link 
                        to={`/movies/${randomMovie.id}`} 
                        className="btn btn-primary"
                      >
                        View Details
                      </Link>
                      <button 
                        className="btn btn-outline"
                        onClick={pickRandomMovie}
                        disabled={spinning}
                      >
                        Pick Another
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RandomMoviePage;
