// src/pages/MovieImportPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocalSearchPanel from '../components/imports/LocalSearchPanel';
import MovieImportModal from '../components/imports/MovieImportModal';
import MovieRequestButton from '../components/MovieRequestButton';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection } from 'firebase/firestore';
import { saveUserMovie, getUserMoviesWithDetails } from '../utils/userMovieUtils';
import { clearMovieCache } from '../utils/cacheUtils';

const MovieImportPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [selected, setSelected] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Movie IDs (Firestore movie doc IDs) already in the user’s collection
  const [userMovieIds, setUserMovieIds] = useState<string[]>([]);

  // Load user's existing movie IDs so Local panel can mark "In Collection"
  useEffect(() => {
    const fetchUserMovieIds = async () => {
      if (!currentUser) {
        setUserMovieIds([]);
        return;
      }

      try {
        const { userMovies } = await getUserMoviesWithDetails(currentUser.uid);
        setUserMovieIds(Object.keys(userMovies)); // keys are movie (catalogue) doc IDs
      } catch (err) {
        console.error('Error loading user movies for import page:', err);
      }
    };

    fetchUserMovieIds();
  }, [currentUser]);

  // Local flow – no external call needed (will just show the basic card)
  const onSelectLocal = (movieLike: any) => {
    setMsg(null);
    setShowDetails(false);
    setSelected(movieLike); // opens modal
  };

  const addToCollection = async () => {
    if (!currentUser || !selected) return;
    try {
      setLoading(true);
      setMsg(null);

      const moviesRef = collection(db, 'movies');
      let movieId: string;

      if (selected.firestoreId) {
        // Local catalogue entry: we already have a Firestore movie document
        movieId = selected.firestoreId;
      } else {
        // Safety net: Local import should always provide a firestoreId
        setMsg({ type: 'error', text: 'Unable to add this movie from catalogue.' });
        setLoading(false);
        return;
      }

      await saveUserMovie(currentUser.uid, movieId, {
        userId: currentUser.uid,
        movieId,
        watched: false,
        favorite: false,
      });

      // update local list of userMovieIds so the badge appears immediately
      setUserMovieIds((prev) =>
        prev.includes(movieId) ? prev : [...prev, movieId]
      );

      // Clear global movie cache so MoviesPage refetches fresh data
      clearMovieCache();

      setMsg({ type: 'success', text: 'Added to your collection!' });
      setShowDetails(false);
      setSelected(null); // close modal
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message ?? 'Failed to add movie' });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (!loading) {
      setSelected(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link to="/movies" className="btn btn-primary btn-sm sm:btn-md">
          <i className="fas fa-arrow-left mr-2"></i> Back to Movies
        </Link>
      </div>
      <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line mb-6">
        Add Movies
      </h1>

      {msg && (
        <div
          className={`alert ${
            msg.type === 'error' ? 'alert-error' : 'alert-success'
          } mb-4`}
        >
          <i
            className={`fas ${
              msg.type === 'error'
                ? 'fa-exclamation-circle'
                : 'fa-check-circle'
            } mr-2`}
          />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="mb-4">
        <MovieRequestButton />
      </div>

      <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
        <LocalSearchPanel
          onSelect={onSelectLocal}
          userMovieIds={userMovieIds}
        />
      </div>

      {/* Modal for selected movie */}
      {selected && (
        <MovieImportModal
          selected={selected}
          showDetails={showDetails}
          loading={loading}
          onToggleDetails={() => setShowDetails(prev => !prev)}
          onAdd={addToCollection}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default MovieImportPage;
