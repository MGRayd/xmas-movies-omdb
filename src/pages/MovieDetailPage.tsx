import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getMovieIdFromUrl } from '../utils/urlUtils';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Movie, UserMovie } from '../types/movie';
import { getUserMovie, saveUserMovie, deleteUserMovie } from '../utils/userMovieUtils';
import { bumpWatchedTotal } from '../utils/stats';
import VibeReview from '../components/VibeReview'; // ⭐ NEW
import { ACHIEVEMENTS, checkAndUnlockAchievements } from '../utils/achievements';
import { useToast } from '../ui/ToastProvider';

const MovieDetailPage: React.FC = () => {
  const { movieId: slugParam } = useParams<{ movieId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();
  
  // Get the actual movie ID from the URL query parameter
  const movieId = getMovieIdFromUrl(location.search);

  const origin = (location.state as { from?: string } | null)?.from;
  const backHref = origin === 'import' ? '/import' : '/movies';
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [userMovie, setUserMovie] = useState<UserMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [watched, setWatched] = useState(false);
  const [watchedDate, setWatchedDate] = useState<string>('');
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [vibeTags, setVibeTags] = useState<string[]>([]); // ⭐ NEW

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!currentUser || !movieId) {
        setError('Movie not found');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch movie details
        const movieDoc = await getDoc(doc(db, 'movies', movieId));
        if (!movieDoc.exists()) {
          setError('Movie not found');
          setLoading(false);
          return;
        }
        
        const movieData = { id: movieDoc.id, ...movieDoc.data() } as Movie;
        setMovie(movieData);
        
        // Fetch user's movie data using the new utility function
        const userMovieData = await getUserMovie(currentUser.uid, movieId);
        
        if (userMovieData) {
          setUserMovie(userMovieData);
          
          // Set form state
          setWatched(userMovieData.watched);
          // Handle watchedDate with robust error handling
          let dateStr = '';
          if (userMovieData.watchedDate) {
            try {
              // If it's already a Date object
              if (userMovieData.watchedDate instanceof Date) {
                dateStr = userMovieData.watchedDate.toISOString().split('T')[0];
              } else {
                // If it's a Firestore timestamp, it has seconds and nanoseconds
                const watchedDateValue = userMovieData.watchedDate as unknown;
                if (typeof watchedDateValue === 'object' && watchedDateValue !== null && 'seconds' in watchedDateValue) {
                  // It's a Firestore Timestamp
                  const firestoreTimestamp = watchedDateValue as { seconds: number; nanoseconds: number };
                  const timestamp = new Date(firestoreTimestamp.seconds * 1000);
                  dateStr = timestamp.toISOString().split('T')[0];
                } else {
                  // Try to parse as a regular date string
                  const parsedDate = new Date(userMovieData.watchedDate as any);
                  if (!isNaN(parsedDate.getTime())) {
                    dateStr = parsedDate.toISOString().split('T')[0];
                  }
                }
              }
            } catch (error) {
              console.error('Error parsing watchedDate:', error);
            }
          }
          setWatchedDate(dateStr);
          setRating(userMovieData.rating || null);
          setReview(userMovieData.review || '');
          setFavorite(userMovieData.favorite);
          setVibeTags(userMovieData.vibeTags || []); // ⭐ NEW
        }
      } catch (err) {
        console.error('Error fetching movie data:', err);
        setError('Failed to load movie data');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [currentUser, movieId]);

  const handleSave = async () => {
    if (!currentUser || !movieId || !movie) return;
    
    try {
      setSaving(true);
      
      const userData: Partial<UserMovie> = {
        userId: currentUser.uid,
        movieId,
        watched,
        favorite,
        updatedAt: new Date(),
        vibeTags, // ⭐ NEW
      };
      
      // Add optional fields
      if (watched && watchedDate) {
        try {
          userData.watchedDate = new Date(watchedDate);
          // Validate that the date is valid
          if (isNaN(userData.watchedDate.getTime())) {
            // If invalid, don't include it
            delete userData.watchedDate;
          }
        } catch (error) {
          console.error('Error parsing watchedDate for save:', error);
          // If there's an error, don't include the date
          delete userData.watchedDate;
        }
      } else if (!watched) {
        // If not watched, remove the watched date
        userData.watchedDate = null;
      }
      
      // Always include rating, even if null, to ensure it gets cleared when needed
      userData.rating = rating;
      
      // Always include review, set to empty string if cleared
      userData.review = review || null;
      
      // Use the utility function to save the user movie
      const updatedUserMovie = await saveUserMovie(currentUser.uid, movieId, userData);
      setUserMovie(updatedUserMovie);
      const newlyUnlocked = await checkAndUnlockAchievements(currentUser.uid);
      if (newlyUnlocked.length) {
        const names = newlyUnlocked
          .map(id => ACHIEVEMENTS.find(a => a.id === id)?.name || id)
          .join(', ');
        toast.success(`You unlocked: ${names}! 🎉`);
      }
      
    } catch (err) {
      console.error('Error saving movie data:', err);
      setError('Failed to save movie data');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !movieId) return;

    const next = !favorite;
    setFavorite(next); // optimistic UI

    try {
      const ref = doc(db, 'users', currentUser.uid, 'movies', movieId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        // Only update the one field + updatedAt
        await updateDoc(ref, {
          favorite: next,
          updatedAt: new Date(),
        });
      } else {
        // Create minimal doc so Favorites works immediately
        await setDoc(ref, {
          userId: currentUser.uid,
          movieId,
          favorite: next,
          watched: false,
          rating: null,
          review: '',
          vibeTags: [], // ⭐ NEW (keep shape consistent)
          addedAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
      }

      // reflect in local userMovie so the page shows current state
      setUserMovie((u) => (u ? { ...u, favorite: next } : u));

      const newlyUnlocked = await checkAndUnlockAchievements(currentUser.uid);
      if (newlyUnlocked.length) {
        const names = newlyUnlocked
          .map(id => ACHIEVEMENTS.find(a => a.id === id)?.name || id)
          .join(', ');
        toast.success(`You unlocked: ${names}! 🎉`);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      // revert on error
      setFavorite(!next);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !movieId || !window.confirm('Are you sure you want to remove this movie from your collection?')) return;
    
    try {
      setSaving(true);
      
      // Use the utility function to delete the user movie
      await deleteUserMovie(currentUser.uid, movieId);
      
      navigate('/movies');
    } catch (err) {
      console.error('Error deleting movie:', err);
      setError('Failed to delete movie');
      setSaving(false);
    }
  };

  // Watched
  const handleToggleWatched = async () => {
    if (!currentUser || !movieId) return;

    const next = !watched;
    setWatched(next); // optimistic

    try {
      const ref = doc(db, 'users', currentUser.uid, 'movies', movieId);
      const snap = await getDoc(ref);
      const prev = snap.exists() ? !!snap.data().watched : false;

      if (snap.exists()) {
        await updateDoc(ref, {
          watched: next,
          // optionally clear watchedDate when turning off
          ...(next ? {} : { watchedDate: null }),
          updatedAt: new Date(),
        });
      } else {
        await setDoc(ref, {
          userId: currentUser.uid,
          movieId,
          watched: next,
          favorite: false,
          rating: null,
          review: '',
          vibeTags: [], // ⭐ NEW
          addedAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
      }

      // reflect locally
      setUserMovie((u) => (u ? { ...u, watched: next } : u));

      // bump global stats only if the value actually changed
      if (prev !== next) {
        await bumpWatchedTotal(next ? 1 : -1);
      }

      const newlyUnlocked = await checkAndUnlockAchievements(currentUser.uid);
      if (newlyUnlocked.length) {
        const names = newlyUnlocked
          .map(id => ACHIEVEMENTS.find(a => a.id === id)?.name || id)
          .join(', ');
        toast.success(`You unlocked: ${names}! 🎉`);
      }

    } catch (err) {
      console.error('Failed to toggle watched', err);
      setWatched(!next); // revert
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>Movie not found</span>
        </div>
        <div className="mt-4">
          <Link to={backHref} className="btn btn-primary btn-sm sm:btn-md">
            <i className="fas fa-arrow-left mr-2"></i> Back to Movies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link to={backHref} className="btn btn-primary btn-sm sm:btn-md">
          <i className="fas fa-arrow-left mr-2"></i> Back to Movies
        </Link>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Movie Poster */}
        <div className="md:col-span-1">
          <div className="rounded-lg overflow-hidden shadow-xl">
            {movie.posterUrl ? (
              <img 
                src={movie.posterUrl} 
                alt={movie.title} 
                className="w-full object-contain"
                style={{ aspectRatio: '2/3' }}
              />
            ) : (
              <div className="w-full flex items-center justify-center bg-gray-800" style={{ aspectRatio: '2/3' }}>
                <i className="fas fa-film text-6xl text-gray-500"></i>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex flex-col gap-2">
            <button
              className={`btn ${favorite ? 'btn-primary' : 'btn-outline'} w-full`}
              onClick={handleToggleFavorite}
            >
              <i className={`fas fa-star mr-2 ${favorite ? 'text-white' : ''}`}></i>
              {favorite ? 'Favourited' : 'Add to Favourites'}
            </button>
            
            <button 
              className={`btn ${watched ? 'btn-success' : 'btn-outline'} w-full`}
              onClick={handleToggleWatched}
            >
              <i className={`fas fa-check mr-2 ${watched ? 'text-white' : ''}`}></i>
              {watched ? 'Watched' : 'Mark as Watched'}
            </button>
            
            <button 
              className="btn btn-error btn-outline w-full"
              onClick={handleDelete}
              disabled={saving}
            >
              <i className="fas fa-trash mr-2"></i>
              Remove from Collection
            </button>
            {movie.tmdbId && (
              <div className="mt-2 flex flex-col items-center">
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline w-full flex items-center justify-center gap-2"
                >
                  <img
                    src="/tmdb.svg"
                    alt="TMDB"
                    className="h-5"
                  />
                </a>
                <p className="mt-2 text-xs text-gray-400 text-center">
                  This product uses the TMDB API but is not endorsed or certified by TMDB.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Movie Details */}
        <div className="md:col-span-2">
          <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line mb-2">{movie.title}</h1>
          
          {movie.releaseDate && (
            <p className="text-lg text-gray-400 mb-4">{new Date(movie.releaseDate).getFullYear()}</p>
          )}
          
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genres.map((genre, index) => (
                <span key={index} className="badge badge-outline">{genre}</span>
              ))}
            </div>
          )}
          
          {movie.runtime && (
            <p className="mb-4">
              <i className="fas fa-clock mr-2 text-xmas-gold"></i>
              {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
            </p>
          )}
          
          {movie.overview && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Overview</h2>
              <p className="text-gray-300">{movie.overview}</p>
            </div>
          )}
          
          {movie.directors && movie.directors.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2">Director{movie.directors.length > 1 ? 's' : ''}</h2>
              <p>{movie.directors.join(', ')}</p>
            </div>
          )}
          
          {movie.cast && movie.cast.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Cast</h2>
              <p className="flex flex-wrap gap-1">
                {movie.cast.slice(0, 10).map((name, i) => (
                  <React.Fragment key={name}>
                    <Link
                      to={`/movies?q=${encodeURIComponent(name)}&field=cast`}
                      className="link link-primary"
                    >
                      {name}
                    </Link>
                    {i < Math.min(movie.cast.length, 10) - 1 && <span>,&nbsp;</span>}
                  </React.Fragment>
                ))}
              </p>
            </div>
          )}
          
          <div className="divider"></div>
          
          {/* User Rating and Review */}
          <h2 className="text-2xl font-christmas text-xmas-gold mb-4">Your Rating & Review</h2>
          
          {watched && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Date Watched</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered" 
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
              />
            </div>
          )}
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Your Rating</span>
            </label>
            <div className="rating rating-lg">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <input 
                  key={value}
                  type="radio" 
                  name="rating" 
                  className={`mask mask-star-2 ${value <= 5 ? 'bg-orange-400' : 'bg-yellow-400'}`}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                />
              ))}
            </div>
            {rating && (
              <div className="mt-2">
                <button 
                  className="btn btn-xs btn-ghost"
                  onClick={() => setRating(null)}
                >
                  Clear Rating
                </button>
              </div>
            )}
          </div>

          {/* ⭐ NEW: VibeReview helper */}
          <VibeReview
            rating={rating}
            initialTags={vibeTags}
            initialAutoReview={review}
            onChange={({ tags, autoReview }) => {
              setVibeTags(tags);
              setReview(autoReview);
            }}
          />
          
          <div className="form-control mb-6 mt-4">
            <label className="label">
              <span className="label-text">Your Review</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-32" 
              placeholder="Write your thoughts about this movie..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button 
              className="btn btn-primary btn-sm sm:btn-md"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailPage;
