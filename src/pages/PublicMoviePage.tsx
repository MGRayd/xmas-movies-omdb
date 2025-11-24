import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie, UserMovie } from '../types/movie';

const PublicMoviePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [owner, setOwner] = useState<any | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [userMovie, setUserMovie] = useState<UserMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const movieId = searchParams.get('id');
      if (!slug || !movieId) return;

      try {
        setLoading(true);
        setError(null);

        // Find the public profile by slug
        const usersRef = collection(db, 'publicProfiles');
        const uq = query(
          usersRef,
          where('publicWatchlistSlug', '==', slug),
          where('isPublicWatchlist', '==', true)
        );
        const snapshot = await getDocs(uq);

        if (snapshot.empty) {
          setError("This watchlist isn't public (or no longer exists).");
          setLoading(false);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        setOwner(userData);

        const ownerUserId = userData.userId as string;

        // Load movie details
        const movieRef = doc(db, 'movies', movieId);
        const movieSnap = await getDoc(movieRef);
        if (!movieSnap.exists()) {
          setError('Movie not found');
          setLoading(false);
          return;
        }
        const movieData = { id: movieSnap.id, ...movieSnap.data() } as Movie;
        setMovie(movieData);

        // Load this user's movie doc (rating / review / vibes)
        const userMovieRef = doc(db, 'users', ownerUserId, 'movies', movieId);
        const userMovieSnap = await getDoc(userMovieRef);
        if (userMovieSnap.exists()) {
          setUserMovie({ id: userMovieSnap.id, ...(userMovieSnap.data() as any) } as UserMovie);
        } else {
          setUserMovie(null);
        }
      } catch (err) {
        console.error('Error loading public movie', err);
        setError('Failed to load this movie.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, searchParams]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (movie && owner) {
      const displayName = owner.publicWatchlistName || `${owner.displayName}'s Xmas Watchlist`;
      document.title = `${movie.title} – ${displayName}`;
    } else {
      document.title = 'Christmas Movies';
    }
  }, [movie, owner]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  if (error || !owner || !movie) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-xmas-card p-8 rounded-lg text-center max-w-xl mx-auto">
          <h1 className="font-christmas text-3xl text-xmas-line mb-4">Movie Not Available</h1>
          <p className="mb-4">{error || 'This movie could not be found for this watchlist.'}</p>
          {slug && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/u/${slug}`)}
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Watchlist
            </button>
          )}
        </div>
      </div>
    );
  }

  const displayName = owner.publicWatchlistName || `${owner.displayName}'s Xmas Watchlist`;

  const watchedLabel = userMovie?.watched ? 'Watched' : 'Not watched yet';

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-10">
      <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          {owner.photoURL ? (
            <img
              src={owner.photoURL}
              alt={owner.displayName}
              className="w-10 h-10 rounded-full border border-xmas-gold"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-xmas-gold">
              <i className="fas fa-user text-sm text-gray-300"></i>
            </div>
          )}
          <div className="text-sm">
            <div className="font-semibold">{displayName}</div>
            <button
              className="link link-primary text-xs"
              onClick={() => navigate(`/u/${slug}`)}
            >
              ← Back to watchlist
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Poster column */}
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
              <div
                className="w-full flex items-center justify-center bg-gray-800"
                style={{ aspectRatio: '2/3' }}
              >
                <i className="fas fa-film text-6xl text-gray-500"></i>
              </div>
            )}
          </div>

          {movie.tmdbId && (
            <div className="mt-4 flex flex-col items-center">
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

          {userMovie && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-xmas-mute">Status</span>
                <span className="font-semibold">{watchedLabel}</span>
              </div>
              {userMovie.rating != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-xmas-mute">Rating</span>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">
                      <i className="fas fa-star"></i>
                    </span>
                    <span className="font-semibold">{userMovie.rating}/10</span>
                  </div>
                </div>
              )}
              {userMovie.watchedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-xmas-mute">Watched on</span>
                  <span className="font-semibold">
                    {(() => {
                      const d = (userMovie.watchedDate as any)?.toDate
                        ? (userMovie.watchedDate as any).toDate()
                        : new Date(userMovie.watchedDate as any);
                      return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
                    })()}
                  </span>
                </div>
              )}
              {userMovie.vibeTags && userMovie.vibeTags.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-xmas-mute mb-1">Vibe review</div>
                  <div className="flex flex-wrap gap-1.5">
                    {userMovie.vibeTags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-sm bg-xmas-gold bg-opacity-20 text-[0.7rem] border-xmas-gold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details column */}
        <div className="md:col-span-2">
          <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line mb-2">{movie.title}</h1>
          {movie.releaseDate && (
            <p className="text-lg text-gray-400 mb-4">{new Date(movie.releaseDate).getFullYear()}</p>
          )}

          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genres.map((genre) => (
                <span key={genre} className="badge badge-outline">
                  {genre}
                </span>
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
              <h2 className="text-xl font-bold mb-2">
                Director{movie.directors.length > 1 ? 's' : ''}
              </h2>
              <p>{movie.directors.join(', ')}</p>
            </div>
          )}

          {movie.cast && movie.cast.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Cast</h2>
              <p className="flex flex-wrap gap-1">
                {movie.cast.slice(0, 10).map((name, i) => (
                  <React.Fragment key={name}>
                    <span>{name}</span>
                    {i < Math.min(movie.cast.length, 10) - 1 && <span>,&nbsp;</span>}
                  </React.Fragment>
                ))}
              </p>
            </div>
          )}

          {userMovie && userMovie.review && (
            <div className="mt-6">
              <div className="divider"></div>
              <h2 className="text-xl font-bold mb-2">Their Thoughts</h2>
              <p className="whitespace-pre-line text-gray-200 text-sm sm:text-base">
                {userMovie.review}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicMoviePage;
