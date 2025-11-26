// src/pages/MovieImportPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocalSearchPanel from '../components/imports/LocalSearchPanel';
import TmdbSearchPanel from '../components/imports/TmdbSearchPanel';
import ExcelImportWizard from '../components/imports/ExcelImportWizard';
import MovieImportModal from '../components/imports/MovieImportModal';
import MovieRequestButton from '../components/MovieRequestButton';
import { useAuth } from '../contexts/AuthContext';
import { OmdbMovie } from '../types/movie';
import { getMovieDetailsOmdb, formatOmdbMovie } from '../services/omdbService';
import { db } from '../firebase';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { saveUserMovie, getUserMoviesWithDetails } from '../utils/userMovieUtils';
import { clearMovieCache } from '../utils/cacheUtils';
import { useIsAdmin } from '../hooks/useIsAdmin';

const MovieImportPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [active, setActive] = useState<'local' | 'tmdb' | 'excel'>('local');
  const [selected, setSelected] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Movie IDs (Firestore movie doc IDs) already in the user’s collection
  const [userMovieIds, setUserMovieIds] = useState<string[]>([]);

  useEffect(() => {
    // Only bother with OMDb key for admins
    if (isAdmin && userProfile?.omdbApiKey) {
      setTmdbApiKey(userProfile.omdbApiKey);
    } else {
      setTmdbApiKey('');
    }
  }, [userProfile, isAdmin]);

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

  // OMDb flow – admins only
  const onSelectTmdb = async (movieLike: OmdbMovie) => {
    if (!isAdmin) {
      setMsg({ type: 'error', text: 'Only admins can import directly from OMDb.' });
      return;
    }
    if (!tmdbApiKey) {
      setMsg({ type: 'error', text: 'OMDb key required to fetch details.' });
      return;
    }
    try {
      setLoading(true);
      setMsg(null);
      setShowDetails(false);
      const details = await getMovieDetailsOmdb(movieLike.imdbID, tmdbApiKey);
      setSelected(details); // opens modal with full OMDb details
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message ?? 'Failed to fetch details' });
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async () => {
    if (!currentUser || !selected) return;
    try {
      setLoading(true);
      setMsg(null);

      const moviesRef = collection(db, 'movies');
      const snap = await getDocs(query(moviesRef, where('imdbId', '==', selected.imdbID)));
      let movieId: string;
      if (snap.empty) {
        // Only admins should ever cause a new catalogue movie to be created
        if (!isAdmin) {
          setMsg({ type: 'error', text: 'Only admins can add new catalogue movies.' });
          setLoading(false);
          return;
        }
        const ref = await addDoc(moviesRef, {
          ...formatOmdbMovie(selected),
          addedAt: new Date(),
          updatedAt: new Date(),
        });
        movieId = ref.id;
      } else {
        movieId = snap.docs[0].id;
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

      {/* Tabs – show all import options only if admin */}
      {isAdmin && (
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${active === 'local' ? 'tab-active' : ''}`}
            onClick={() => setActive('local')}
          >
            <i className="fas fa-database mr-2" />
            Local
          </button>

          <button
            className={`tab ${active === 'tmdb' ? 'tab-active' : ''}`}
            onClick={() => setActive('tmdb')}
          >
            <i className="fas fa-search mr-2" />
            OMDb
          </button>

          <button
            className={`tab ${active === 'excel' ? 'tab-active' : ''}`}
            onClick={() => setActive('excel')}
          >
            <i className="fas fa-file-excel mr-2" />
            Excel
          </button>
        </div>
      )}

      {active === 'local' && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          <LocalSearchPanel
            onSelect={onSelectLocal}
            userMovieIds={userMovieIds}
          />
        </div>
      )}

      {active === 'tmdb' && isAdmin && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!tmdbApiKey && (
            <div className="alert alert-warning mb-4">
              <i className="fas fa-exclamation-triangle mr-2" />
              <span>Set your OMDb API key in Profile to search OMDb.</span>
            </div>
          )}
          <TmdbSearchPanel tmdbApiKey={tmdbApiKey} onSelect={onSelectTmdb} />
        </div>
      )}

      {active === 'excel' && isAdmin && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!tmdbApiKey && (
            <div className="alert alert-warning mb-4">
              <i className="fas fa-exclamation-triangle mr-2" />
              <span>OMDb key required for matching.</span>
            </div>
          )}
          {currentUser ? (
            <ExcelImportWizard
              tmdbApiKey={tmdbApiKey}
              userId={currentUser.uid}
              onDone={() => setActive('local')}
            />
          ) : (
            <div className="alert alert-info">Log in to import from Excel.</div>
          )}
        </div>
      )}

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
