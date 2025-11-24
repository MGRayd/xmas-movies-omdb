import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createSlugFromTitle } from '../utils/urlUtils';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie, UserMovie } from '../types/movie';
import { getUserMoviesWithDetails } from '../utils/userMovieUtils';

interface PublicStats {
  totalWatched: number;
  averageRating: number;
  favoriteMovies: number;
}

const PublicWatchlistPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<any | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [userMovies, setUserMovies] = useState<{ [movieId: string]: UserMovie }>({});
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const usersRef = collection(db, 'publicProfiles');
        const q = query(
          usersRef,
          where('publicWatchlistSlug', '==', slug),
          where('isPublicWatchlist', '==', true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("This watchlist isn't public (or no longer exists).");
          setLoading(false);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        setProfile(userData);

        const ownerUserId = userData.userId as string;

        const { userMovies: userMoviesMap, movies: moviesData } = await getUserMoviesWithDetails(ownerUserId);

        const watchedMovies = moviesData.filter((m) => {
          const um = userMoviesMap[m.id];
          return um && um.watched;
        }).sort((a, b) => {
          const ua = userMoviesMap[a.id];
          const ub = userMoviesMap[b.id];
          const ra = ua?.rating ?? 0;
          const rb = ub?.rating ?? 0;

          if (rb !== ra) return rb - ra; // higher rating first

          // Fallback: sort by title
          return a.title.localeCompare(b.title);
        });

        const watchedUserMovies: { [movieId: string]: UserMovie } = {};
        watchedMovies.forEach((m) => {
          watchedUserMovies[m.id] = userMoviesMap[m.id];
        });

        const rated = watchedMovies
          .map((m) => watchedUserMovies[m.id])
          .filter((um) => um && um.rating != null) as UserMovie[];

        const averageRating =
          rated.length > 0
            ? rated.reduce((sum, um) => sum + (um.rating || 0), 0) / rated.length
            : 0;

        const favoriteMovies = watchedMovies.filter((m) => watchedUserMovies[m.id]?.favorite).length;

        setMovies(watchedMovies);
        setUserMovies(watchedUserMovies);
        setStats({
          totalWatched: watchedMovies.length,
          averageRating,
          favoriteMovies,
        });
      } catch (err) {
        console.error('Error loading public watchlist:', err);
        setError("This watchlist isn't public (or no longer exists).");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (profile) {
      const displayName = profile.publicWatchlistName || `${profile.displayName}'s Xmas Watchlist`;
      document.title = `${displayName} – Christmas Movies`;
    } else {
      document.title = 'Christmas Movies';
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="bg-xmas-card p-8 rounded-lg text-center max-w-xl mx-auto">
          <h1 className="font-christmas text-3xl text-xmas-line mb-4">Watchlist Not Available</h1>
          <p className="mb-4">{error || "This watchlist isn't public (or no longer exists)."}</p>
          <Link to="/" className="btn btn-primary">
            <i className="fas fa-home mr-2"></i>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.publicWatchlistName || `${profile.displayName}'s Xmas Watchlist`;
  const tagline = profile.publicWatchlistTagline;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-10">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-xmas-gold shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-700 flex items-center justify-center border-2 border-xmas-gold shadow-lg">
              <i className="fas fa-user text-2xl text-gray-300"></i>
            </div>
          )}
          <div>
            <h1 className="font-christmas text-2xl sm:text-3xl md:text-4xl text-xmas-line mb-1">
              {displayName}
            </h1>
            {tagline && <p className="text-sm sm:text-base text-xmas-mute">{tagline}</p>}
          </div>
        </div>

        {stats && (
          <div className="bg-xmas-card px-4 py-3 rounded-lg shadow-md flex flex-wrap gap-4 text-sm sm:text-base">
            <div>
              <div className="text-xs uppercase tracking-wide text-xmas-mute">Watched</div>
              <div className="font-bold text-lg">{stats.totalWatched}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-xmas-mute">Average Rating</div>
              <div className="font-bold text-lg">{stats.averageRating.toFixed(1)}/10</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-xmas-mute">Favorites</div>
              <div className="font-bold text-lg">{stats.favoriteMovies}</div>
            </div>
          </div>
        )}
      </header>

      {movies.length === 0 ? (
        <div className="bg-xmas-card p-8 rounded-lg text-center max-w-xl mx-auto">
          <h2 className="text-xl mb-3">No watched movies yet</h2>
          <p className="text-sm text-xmas-mute">
            As soon as they start marking movies as watched, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {movies.map((movie) => {
            const userMovie = userMovies[movie.id];
            return (
              <Link
                key={movie.id}
                to={`/u/${slug}/m/${createSlugFromTitle(movie.title)}?id=${movie.id}`}
                className="block transition-transform hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="relative rounded-lg overflow-hidden bg-xmas-card shadow-md h-full flex flex-col">
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
                      <div
                        className="w-full flex items-center justify-center bg-gray-800"
                        style={{ aspectRatio: '2/3' }}
                      >
                        <i className="fas fa-film text-2xl text-gray-500"></i>
                      </div>
                    )}

                    {userMovie && userMovie.watched && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-1 shadow-md">
                        <i className="fas fa-check text-xs text-white"></i>
                      </div>
                    )}

                    {userMovie && userMovie.favorite && (
                      <div className="absolute top-1 left-1 text-yellow-400 drop-shadow-md">
                        <i className="fas fa-star text-sm"></i>
                      </div>
                    )}
                  </div>

                  <div className="p-1 sm:p-2 flex-grow flex flex-col">
                    <h3 className="text-xs sm:text-sm font-medium line-clamp-2">{movie.title}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-400">{movie.releaseDate?.substring(0, 4)}</p>
                      {userMovie && userMovie.rating != null && (
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
    </div>
  );
};

export default PublicWatchlistPage;
