import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collectionGroup, query, where, getCountFromServer, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [now, setNow] = useState<Date>(new Date());
  const [watchedTotal, setWatchedTotal] = useState<number | null>(null);
  
// live clock for countdown
useEffect(() => {
  const t = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(t);
}, []);

// compute next Christmas (Dec 25)
const target = useMemo(() => {
  const y = now.getFullYear();
  const christmas = new Date(y, 11, 25, 0, 0, 0); // month is 0-based
  return now > christmas ? new Date(y + 1, 11, 25, 0, 0, 0) : christmas;
}, [now]);

const countdown = useMemo(() => {
  const diff = target.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}, [now, target]);

// live watched total
useEffect(() => {
  const ref = doc(db, 'stats', 'global');

  // realtime (recommended)
  const unsub = onSnapshot(ref, (snap) => {
    const data = snap.data();
    setWatchedTotal(typeof data?.watchedTotal === 'number' ? data.watchedTotal : 0);
  });

  return () => unsub();
}, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-christmas text-5xl md:text-7xl text-xmas-line mb-4">
          My Christmas Movies
        </h1>
        <p className="text-xl md:text-2xl text-xmas-snow mb-8">Track, rate, and discover your favourite Christmas movies!</p>
        
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-12">
          {currentUser ? (
            <>
              <Link 
                to="/movies" 
                className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
              >
                <i className="fas fa-film mr-2"></i> My Movies
              </Link>
              <Link 
                to="/random" 
                className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
              >
                <i className="fas fa-random mr-2"></i> Random Movie
              </Link>
            </>
          ) : (
            <Link 
              to="/login" 
              className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
            >
              <i className="fas fa-sign-in-alt mr-2"></i> Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Subtle decoration */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-xmas-gold to-transparent"></div>
      </div>

      {/* Stats & Countdown */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-30 relative">
        <h2 className="font-christmas text-3xl text-xmas-gold text-center mb-6">
          Countdown to Christmas
        </h2>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* Countdown */}
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line flex flex-col items-center justify-center">
            <div className="text-5xl md:text-6xl font-bold text-xmas-line mb-2">
              {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
            </div>
            <p className="text-xmas-text text-opacity-80">until Christmas Day</p>
          </div>

          {/* Watched total */}
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-gold flex flex-col items-center justify-center">
            <div className="text-5xl md:text-6xl font-bold text-xmas-gold mb-2">
              {watchedTotal ?? '–'}
            </div>
            <p className="text-xmas-text text-opacity-80 text-center">
              total movies watched
            </p>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-20 snow-accumulation snow-accumulation-slow relative">
        <h2 className="font-christmas text-3xl text-xmas-line mb-6 text-center">Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-search"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Find Movies</h3>
            <p className="text-center text-xmas-text text-opacity-80">Search and discover Christmas movies using TMDB integration</p>
          </div>
          
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-gold">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-star"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Rate & Review</h3>
            <p className="text-center text-xmas-text text-opacity-80">Keep track of movies you've watched and rate them</p>
          </div>
          
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-random"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Random Picker</h3>
            <p className="text-center text-xmas-text text-opacity-80">Can't decide what to watch? Let our random movie picker help!</p>
          </div>
        </div>
      </div>
      
      {/* Import section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-30 snow-accumulation snow-accumulation-fast relative">
        <div className="mb-6 text-center">
          <h2 className="font-christmas text-3xl md:text-4xl text-xmas-gold inline-block relative">
            <span className="relative z-10">Create Your Collection</span>
            <span className="absolute -bottom-2 left-0 right-0 h-1 bg-xmas-gold opacity-30 rounded-full"></span>
          </h2>
          <p className="mt-4 mb-6">Add movies to your collection and rate them</p>
          {currentUser ? (
            <Link to="/import" className="btn btn-primary">
              <i className="fas fa-file-import mr-2"></i> Add Movies
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary">
              <i className="fas fa-sign-in-alt mr-2"></i> Sign In to Add
            </Link>
          )}
        </div>
      </div>

      {/* Modern footer separator */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-xmas-gold to-transparent"></div>
      </div>

      <footer className="text-center text-xmas-mute mt-12 pb-8 space-y-4">
        <p>© {new Date().getFullYear()} Christmas Movie Database</p>
        <div className="flex flex-col items-center justify-center gap-2 text-xs md:text-sm text-xmas-mute/80">
          <a
                  href={`https://www.themoviedb.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn flex items-center justify-center gap-2"
                >
          <img
            src="/tmdb.svg"
            alt="TMDB logo"
            className="h-6 md:h-8 w-auto mb-1"
          />
          </a>
          <p className="max-w-xl px-4">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
