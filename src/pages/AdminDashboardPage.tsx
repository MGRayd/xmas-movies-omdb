import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import { updateMoviesWithSortTitles } from '../utils/migrationUtils';
import { upsertMoviesByTmdbIds } from '../utils/catalogueImportUtils';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  const { userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [movieStats, setMovieStats] = useState({
    totalMovies: 0,
    moviesWithSortTitle: 0
  });

  // NEW: Catalogue Builder state
  const [tmdbApiKey, setTmdbApiKey] = useState<string>('');
  const [rawIds, setRawIds] = useState<string>('');
  const [slowMode, setSlowMode] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  useEffect(() => {
    if (userProfile?.tmdbApiKey) {
      setTmdbApiKey(userProfile.tmdbApiKey);
    }
  }, [userProfile]);

  // Redirect if not admin
  useEffect(() => {
    if (!adminCheckLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  // Fetch movie stats
  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;
      
      setLoading(true);
      try {
        // Fetch movie stats
        const moviesSnapshot = await getDocs(collection(db, 'movies'));
        const totalMovies = moviesSnapshot.size;
        let moviesWithSortTitle = 0;
        
        moviesSnapshot.forEach(doc => {
          const movieData = doc.data();
          if (movieData.sortTitle) {
            moviesWithSortTitle++;
          }
        });
        
        setMovieStats({
          totalMovies,
          moviesWithSortTitle
        });
      } catch (err) {
        console.error('Error fetching movie data:', err);
        setError('Failed to load movie data');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Handle sort title migration
  const handleUpdateSortTitles = async () => {
    try {
      setMigrationLoading(true);
      setError(null);
      
      const result = await updateMoviesWithSortTitles();
      
      setSuccess(`Sort titles updated for ${result.updated} out of ${result.total} movies.`);
      
      setMovieStats(prev => ({
        ...prev,
        moviesWithSortTitle: prev.moviesWithSortTitle + result.updated
      }));
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error updating sort titles:', err);
      setError(err.message || 'Failed to update sort titles');
    } finally {
      setMigrationLoading(false);
    }
  };

  // NEW: Parse IDs from textarea
  const parsedIds = useMemo(() => {
    const tokens = rawIds
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean);
    const nums = tokens
      .map(t => Number(t))
      .filter(n => Number.isInteger(n) && n > 0);
    return Array.from(new Set(nums)); // dedupe
  }, [rawIds]);

  // NEW: Catalogue import handler
  const handleCatalogueImport = async () => {
    setError(null);
    setSuccess(null);

    if (!tmdbApiKey) {
      setError('TMDB API key required');
      return;
    }
    if (parsedIds.length === 0) {
      setError('Please paste at least one valid TMDB ID');
      return;
    }

    try {
      setImporting(true);
      setProgressPct(0);
      setProgressLabel(`Starting… (0 / ${parsedIds.length})`);

      const summary = await upsertMoviesByTmdbIds(
        parsedIds,
        tmdbApiKey,
        (i, total, last) => {
          const pct = Math.round((i / total) * 100);
          setProgressPct(pct);
          setProgressLabel(`Processed ${i} / ${total} (${last})`);
        },
        slowMode ? 300 : 0
      );

      setSuccess(
        `Catalogue updated. Created: ${summary.created}, Updated: ${summary.updated}, Skipped: ${summary.skipped}, Errors: ${summary.errors}.`
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Catalogue import failed.');
    } finally {
      setImporting(false);
    }
  };

  if (adminCheckLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/movies" className="btn btn-outline">
            <i className="fas fa-film mr-2"></i> Movies
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-6">
          <i className="fas fa-check-circle mr-2"></i>
          <span>{success}</span>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-2xl font-christmas mb-4 text-xmas-gold">Movie Administration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Sort Title Migration (existing) */}
          <div className="card bg-xmas-card shadow-xl">
            <div className="card-body">
              <h2 className="card-title font-christmas">
                <i className="fas fa-sort-alpha-down text-primary mr-2"></i> Sort Title Migration
              </h2>
              <p className="mb-4">
                Update all movies to include sort titles (e.g., "The Grinch" → "Grinch") for better alphabetical sorting.
              </p>
              <div className="flex flex-col gap-2">
                <div className="stats bg-base-200 text-base-content">
                  <div className="stat">
                    <div className="stat-title">Total Movies</div>
                    <div className="stat-value">{movieStats.totalMovies}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">With Sort Titles</div>
                    <div className="stat-value">{movieStats.moviesWithSortTitle}</div>
                    <div className="stat-desc">
                      {movieStats.totalMovies > 0 ? 
                        `${Math.round((movieStats.moviesWithSortTitle / movieStats.totalMovies) * 100)}%` : 
                        '0%'}
                    </div>
                  </div>
                </div>
                <button 
                  className="btn btn-primary w-full"
                  onClick={handleUpdateSortTitles}
                  disabled={migrationLoading || movieStats.moviesWithSortTitle === movieStats.totalMovies}
                >
                  {migrationLoading ? (
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                  ) : (
                    <i className="fas fa-sync-alt mr-2"></i>
                  )}
                  {movieStats.moviesWithSortTitle === movieStats.totalMovies ? 
                    'All Movies Updated' : 
                    'Update Sort Titles'}
                </button>
              </div>
            </div>
          </div>

          {/* NEW: Catalogue Builder */}
          <div className="card bg-xmas-card shadow-xl">
            <div className="card-body">
              <h2 className="card-title font-christmas">
                <i className="fas fa-database text-primary mr-2"></i> Catalogue Builder (TMDB IDs)
              </h2>
              <p className="mb-4">
                Bulk-import TMDB titles into your <code>movies</code> catalogue only — no user collections will be updated.
              </p>

              <label className="label mt-4">
                <span className="label-text">TMDB IDs (comma / space / newline separated)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-40"
                value={rawIds}
                onChange={(e) => setRawIds(e.target.value)}
                placeholder={`e.g. 603, 497, 155, 27205
603
497 155
27205`}
              />

              <div className="flex items-center gap-4 mt-4">
                <div className="form-control">
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text">Slow mode (API friendly)</span>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={slowMode}
                      onChange={(e) => setSlowMode(e.target.checked)}
                    />
                  </label>
                </div>

                <button
                  className="btn btn-primary ml-auto"
                  onClick={handleCatalogueImport}
                  disabled={importing || parsedIds.length === 0 || !tmdbApiKey}
                  title={!tmdbApiKey ? 'Add your TMDB API key in Profile > Settings' : undefined}
                >
                  {importing ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2" />
                      Importing {parsedIds.length}…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-import mr-2" />
                      Import {parsedIds.length || 0} to Catalogue
                    </>
                  )}
                </button>
              </div>

              {(importing || progressPct > 0) && (
                <div className="mt-4">
                  <progress className="progress w-full" value={progressPct} max={100} />
                  <div className="text-sm mt-1 opacity-80">{progressLabel}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
