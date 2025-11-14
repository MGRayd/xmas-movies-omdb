// src/pages/MovieImportPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LocalSearchPanel from '../components/imports/LocalSearchPanel';
import TmdbSearchPanel from '../components/imports/TmdbSearchPanel';
import ExcelImportWizard from '../components/imports/ExcelImportWizard';
import { useAuth } from '../contexts/AuthContext';
import { TMDBMovie } from '../types/movie';
import { getMovieDetails, formatTMDBMovie } from '../services/tmdbService';
import { db } from '../firebase';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { saveUserMovie } from '../utils/userMovieUtils';
import { posterSrc } from '../utils/matching';
import { useIsAdmin } from '../hooks/useIsAdmin';   // ⬅️ NEW

const MovieImportPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isAdmin } = useIsAdmin();                 // ⬅️ NEW

  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [active, setActive] = useState<'local'|'tmdb'|'excel'>('local');
  const [selected, setSelected] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type:'error'|'success', text:string} | null>(null);

  useEffect(() => {
    // Only bother with TMDB key for admins
    if (isAdmin && userProfile?.tmdbApiKey) {
      setTmdbApiKey(userProfile.tmdbApiKey);
    } else {
      setTmdbApiKey('');
    }
  }, [userProfile, isAdmin]);

  // Local flow – no TMDB call needed (will just show the basic card)
  const onSelectLocal = (movieLike: TMDBMovie) => {
    setMsg(null);
    setSelected(movieLike);
  };

  // TMDB flow – admins only
  const onSelectTmdb = async (movieLike: TMDBMovie) => {
    if (!isAdmin) {
      setMsg({ type: 'error', text: 'Only admins can import directly from TMDB.' });
      return;
    }
    if (!tmdbApiKey) {
      setMsg({ type: 'error', text: 'TMDB key required to fetch details.' });
      return;
    }
    try {
      setLoading(true); setMsg(null);
      const details = await getMovieDetails(movieLike.id, tmdbApiKey);
      setSelected(details);
    } catch (e:any) {
      setMsg({type:'error', text: e?.message ?? 'Failed to fetch details'});
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async () => {
    if (!currentUser || !selected) return;
    try {
      setLoading(true); setMsg(null);

      const moviesRef = collection(db, 'movies');
      const snap = await getDocs(query(moviesRef, where('tmdbId','==', selected.id)));
      let movieId: string;
      if (snap.empty) {
        // Only admins should ever cause a new catalogue movie to be created
        if (!isAdmin) {
          setMsg({ type: 'error', text: 'Only admins can add new catalogue movies.' });
          setLoading(false);
          return;
        }
        const ref = await addDoc(moviesRef, { 
          ...formatTMDBMovie(selected), 
          addedAt:new Date(), 
          updatedAt:new Date() 
        });
        movieId = ref.id;
      } else {
        movieId = snap.docs[0].id;
      }

      await saveUserMovie(currentUser.uid, movieId, { 
        userId: currentUser.uid, 
        movieId, 
        watched:false, 
        favorite:false 
      });
      setMsg({type:'success', text:'Added to your collection!'});
      setSelected(null);
    } catch (e:any) {
      setMsg({type:'error', text: e?.message ?? 'Failed to add movie'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* header unchanged */}

      <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line mb-6">
        Import Movies
      </h1>

      {msg && (
        <div className={`alert ${msg.type==='error'?'alert-error':'alert-success'} mb-4`}>
          <i className={`fas ${msg.type==='error'?'fa-exclamation-circle':'fa-check-circle'} mr-2`}/>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs – TMDB & Excel only if admin */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${active==='local'?'tab-active':''}`}
          onClick={()=>setActive('local')}
        >
          <i className="fas fa-database mr-2"/>Local
        </button>

        {isAdmin && (
          <button
            className={`tab ${active==='tmdb'?'tab-active':''}`}
            onClick={()=>setActive('tmdb')}
          >
            <i className="fas fa-search mr-2"/>TMDB
          </button>
        )}

        {isAdmin && (
          <button
            className={`tab ${active==='excel'?'tab-active':''}`}
            onClick={()=>setActive('excel')}
          >
            <i className="fas fa-file-excel mr-2"/>Excel
          </button>
        )}
      </div>

      {active==='local' && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          <LocalSearchPanel onSelect={onSelectLocal}/>
        </div>
      )}

      {active==='tmdb' && isAdmin && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!tmdbApiKey && (
            <div className="alert alert-warning mb-4">
              <i className="fas fa-exclamation-triangle mr-2"/>
              <span>Set your TMDB API key in Profile to search TMDB.</span>
            </div>
          )}
          <TmdbSearchPanel tmdbApiKey={tmdbApiKey} onSelect={onSelectTmdb}/>
        </div>
      )}

      {active==='excel' && isAdmin && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!tmdbApiKey && (
            <div className="alert alert-warning mb-4">
              <i className="fas fa-exclamation-triangle mr-2"/>
              <span>TMDB key required for matching.</span>
            </div>
          )}
          {currentUser ? (
            <ExcelImportWizard
              tmdbApiKey={tmdbApiKey}
              userId={currentUser.uid}
              onDone={()=>setActive('local')}
            />
          ) : (
            <div className="alert alert-info">Log in to import from Excel.</div>
          )}
        </div>
      )}

      {/* selected card block stays the same */}
    </div>
  );
};

export default MovieImportPage;
