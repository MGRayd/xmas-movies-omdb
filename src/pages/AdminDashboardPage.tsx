import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import { updateMoviesWithSortTitles } from '../utils/migrationUtils';
import { upsertMoviesByImdbIds } from '../utils/catalogueImportUtils';
import ExcelCatalogueImportWizard from '../components/imports/ExcelCatalogueImportWizard';

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

  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // NEW: Catalogue Builder state (OMDb / IMDb)
  const [omdbApiKey, setOmdbApiKey] = useState<string>('');
  const [rawIds, setRawIds] = useState<string>('');
  const [slowMode, setSlowMode] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  useEffect(() => {
    if (userProfile?.omdbApiKey) {
      setOmdbApiKey(userProfile.omdbApiKey);
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

  useEffect(() => {
    const fetchRequests = async () => {
      if (!isAdmin) return;

      setRequestsLoading(true);
      try {
        const q = query(
          collection(db, 'Requests'),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setRequests(items);
      } catch (err) {
        console.error('Error fetching movie requests:', err);
        setError('Failed to load movie requests');
      } finally {
        setRequestsLoading(false);
      }
    };

    if (isAdmin) {
      fetchRequests();
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

  const handleUpdateRequestStatus = async (
    requestId: string,
    newStatus: 'fulfilled' | 'dismissed'
  ) => {
    try {
      setError(null);
      await updateDoc(doc(db, 'Requests', requestId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSuccess(`Request marked as ${newStatus}.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error updating request status:', err);
      setError(err.message || 'Failed to update request');
    }
  };

  // NEW: Parse IDs from textarea
  const parsedIds = useMemo(() => {
    const tokens = rawIds
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean);
    return Array.from(new Set(tokens)); // IMDb IDs as strings
  }, [rawIds]);

  // NEW: Catalogue import handler
  const handleCatalogueImport = async () => {
    setError(null);
    setSuccess(null);

    if (!omdbApiKey) {
      setError('OMDb API key required');
      return;
    }
    if (parsedIds.length === 0) {
      setError('Please paste at least one valid IMDb ID');
      return;
    }

    try {
      setImporting(true);
      setProgressPct(0);
      setProgressLabel(`Starting… (0 / ${parsedIds.length})`);

      const summary = await upsertMoviesByImdbIds(
        parsedIds,
        omdbApiKey,
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
                <i className="fas fa-database text-primary mr-2"></i> Catalogue Builder (IMDb IDs)
              </h2>
              <p className="mb-4">
                Bulk-import titles by IMDb ID into your <code>movies</code> catalogue only — no user collections will be updated.
              </p>

              <label className="label mt-4">
                <span className="label-text">IMDb IDs (comma / space / newline separated)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-40"
                value={rawIds}
                onChange={(e) => setRawIds(e.target.value)}
                placeholder={`e.g. tt0096061, tt0107688
tt0096061
tt0107688`}
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
                  disabled={importing || parsedIds.length === 0 || !omdbApiKey}
                  title={!omdbApiKey ? 'Add your OMDb API key in Profile > Settings' : undefined}
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

        {/* NEW: Excel Catalogue Import */}
        <div className="card bg-xmas-card shadow-xl">
          <div className="card-body">
            <h2 className="card-title font-christmas">
              <i className="fas fa-file-excel text-primary mr-2"></i> Excel Catalogue Import
            </h2>
            <p className="mb-4 text-sm opacity-80">
              Use an Excel file (title / year / optional IMDb id) to populate or refresh the main
              <code className="mx-1">movies</code> catalogue via OMDb.
            </p>

            {!omdbApiKey && (
              <div className="alert alert-warning mb-4">
                <i className="fas fa-exclamation-triangle mr-2" />
                <span>Add your OMDb API key in Profile to enable Excel catalogue import.</span>
              </div>
            )}

            {omdbApiKey && (
              <ExcelCatalogueImportWizard
                omdbApiKey={omdbApiKey}
                onDone={() => {
                  setSuccess('Excel catalogue import completed.');
                  setTimeout(() => setSuccess(null), 4000);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-christmas mb-4 text-xmas-gold">Movie Requests</h2>
        <div className="card bg-xmas-card shadow-xl">
          <div className="card-body">
            <h2 className="card-title font-christmas flex items-center gap-2">
              <i className="fas fa-gift text-primary" />
              Pending Requests
            </h2>
            <p className="text-sm opacity-80 mb-4">
              These are movies users have asked to be added to the catalogue.
            </p>

            {requestsLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm opacity-80">No pending requests right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Year</th>
                      <th>TMDB</th>
                      <th>Requested By</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => {
                      const createdAt = (req.createdAt as any)?.toDate
                        ? (req.createdAt as any).toDate()
                        : req.createdAt;
                      return (
                        <tr key={req.id}>
                          <td>
                            <div className="font-semibold">{req.title}</div>
                            {createdAt && (
                              <div className="text-xs opacity-70">
                                {new Date(createdAt).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td>{req.year || '-'}</td>
                          <td>
                            {req.tmdbId && (
                              <div className="text-xs">ID: {req.tmdbId}</div>
                            )}
                            {req.tmdbUrl && (
                              <a
                                href={req.tmdbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary text-xs"
                              >
                                View TMDB
                              </a>
                            )}
                          </td>
                          <td>
                            <div className="text-sm">
                              {req.userDisplayName || req.userEmail || req.userId}
                            </div>
                            {req.userEmail && (
                              <div className="text-xs opacity-70">{req.userEmail}</div>
                            )}
                          </td>
                          <td className="max-w-xs whitespace-pre-wrap text-xs">
                            {req.notes || '-'}
                          </td>
                          <td className="flex flex-col gap-1">
                            <button
                              className="btn btn-xs btn-success"
                              onClick={() => handleUpdateRequestStatus(req.id, 'fulfilled')}
                            >
                              Fulfilled
                            </button>
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => handleUpdateRequestStatus(req.id, 'dismissed')}
                            >
                              Dismiss
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
