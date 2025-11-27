import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Movie, UserMovie } from '../types/movie';
import { getUserMovie, saveUserMovie } from '../utils/userMovieUtils';
import { getMovieIdFromUrl } from '../utils/urlUtils';
import { getFanartPostersForMovie, FanartPosterResult } from '../services/fanartService';

const EditMoviePosterPage: React.FC = () => {
  const { movieId: slugParam } = useParams<{ movieId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const movieId = getMovieIdFromUrl(location.search);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [userMovie, setUserMovie] = useState<UserMovie | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [fanartPosters, setFanartPosters] = useState<FanartPosterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until we know who the user is and have their profile (for fanartApiKey)
    if (!currentUser || !movieId) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const movieDoc = await getDoc(doc(db, 'movies', movieId));
        if (!movieDoc.exists()) {
          setError('Movie not found');
          setLoading(false);
          return;
        }
        const movieData = { id: movieDoc.id, ...movieDoc.data() } as Movie;
        setMovie(movieData);

        const userMovieData = await getUserMovie(currentUser.uid, movieId);
        if (userMovieData) {
          setUserMovie(userMovieData);
          setPosterUrl(userMovieData.posterUrlOverride || movieData.posterUrl || '');
        } else {
          setPosterUrl(movieData.posterUrl || '');
        }

        // Load fanart.tv posters (using cache on movie when possible) only when we
        // have either an imdbId or tmdbId and a user fanartApiKey available.
        if ((movieData.imdbId || movieData.tmdbId) && userProfile?.fanartApiKey) {
          try {
            const posters = await getFanartPostersForMovie(
              movieId,
              movieData,
              userProfile.fanartApiKey
            );
            setFanartPosters(posters);
          } catch (e) {
            console.error('Error loading fanart posters:', e);
          }
        }
      } catch (e) {
        console.error('Error loading movie/poster data:', e);
        setError('Failed to load movie data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser, movieId, userProfile]);

  const handleSave = async () => {
    if (!currentUser || !movieId || !movie) return;

    try {
      setSaving(true);
      setError(null);

      const update: Partial<UserMovie> = {
        userId: currentUser.uid,
        movieId,
        posterUrlOverride: posterUrl.trim() || null as any,
      };

      const updated = await saveUserMovie(currentUser.uid, movieId, update);
      setUserMovie(updated);
      navigate(`/movies/${slugParam}${location.search}`);
    } catch (e: any) {
      console.error('Failed to save poster override:', e);
      setError(e?.message || 'Failed to save poster');
    } finally {
      setSaving(false);
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
        <div className="alert alert-error mb-4">
          <span>Movie not found</span>
        </div>
        <Link to="/movies" className="btn btn-primary btn-sm">
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Link to={`/movies/${slugParam}${location.search}`} className="btn btn-primary btn-sm">
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Movie
        </Link>
        <h1 className="font-christmas text-2xl md:text-3xl text-xmas-line ml-2">
          Edit Poster 	for {movie.title}
        </h1>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="rounded-lg overflow-hidden shadow-xl">
            {posterUrl ? (
              <img
                src={posterUrl}
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
        </div>
        <div className="md:col-span-2">
          <div className="bg-xmas-card p-6 rounded-lg shadow-lg space-y-4">
            <h2 className="text-xl font-bold mb-2">Choose a Poster from fanart.tv</h2>
            {!userProfile?.fanartApiKey && (
              <p className="text-sm text-warning mb-2">
                Add your fanart.tv API key on your Profile page to see alternative posters.
              </p>
            )}
            {userProfile?.fanartApiKey && fanartPosters.length === 0 && (
              <p className="text-sm text-gray-300 mb-2">
                No posters were returned from fanart.tv for this movie. The default poster will be used.
              </p>
            )}

            {fanartPosters.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {fanartPosters.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    className={`relative rounded-lg overflow-hidden border-2 transition-transform hover:scale-105 ${
                      posterUrl === p.url ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setPosterUrl(p.url)}
                  >
                    <img
                      src={p.url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: '2/3' }}
                    />
                    {posterUrl === p.url && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <i className="fas fa-check text-2xl text-primary-content"></i>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !posterUrl}
              >
                {saving ? (
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                ) : (
                  <i className="fas fa-save mr-2"></i>
                )}
                Save Poster
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setPosterUrl(movie.posterUrl || '')}
              >
                Reset to default
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditMoviePosterPage;
