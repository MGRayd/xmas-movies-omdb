import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import { updateMoviesWithSortTitles } from '../utils/migrationUtils';
import ExcelCatalogueImportWizard from '../components/imports/ExcelCatalogueImportWizard';
import TmdbSearchPanel from '../components/imports/TmdbSearchPanel';
import { OmdbMovie } from '../types/movie';
import { getMovieDetailsOmdb, formatOmdbMovie } from '../services/omdbService';
import { getMoviePostersFromTmdb, TmdbPoster } from '../services/tmdbService';

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
  const [exportingCsv, setExportingCsv] = useState(false);

  // Import & Posters state
  const [omdbApiKey, setOmdbApiKey] = useState<string>('');
  const [tmdbApiKey, setTmdbApiKey] = useState<string>('');
  const [importActive, setImportActive] = useState<'single' | 'excel'>('single');
  const [selected, setSelected] = useState<OmdbMovie | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [manualTmdbId, setManualTmdbId] = useState('');
  const [posterChoices, setPosterChoices] = useState<TmdbPoster[]>([]);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [chosenPosterUrl, setChosenPosterUrl] = useState<string | null>(null);
  const [searchPanelKey, setSearchPanelKey] = useState(0);

  useEffect(() => {
    if (userProfile?.omdbApiKey) {
      setOmdbApiKey(userProfile.omdbApiKey);
    }
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

  const handleSelectSearchResult = async (movieLike: OmdbMovie) => {
    if (!omdbApiKey) {
      setImportMessage({ type: 'error', text: 'OMDb API key required to fetch details.' });
      return;
    }
    try {
      setImportLoading(true);
      setImportMessage(null);
      const details = await getMovieDetailsOmdb(movieLike.imdbID, omdbApiKey);
      setSelected(details);
      setManualTmdbId('');
      setChosenPosterUrl(null);
      setPosterChoices([]);
      setPosterModalOpen(false);
    } catch (e: any) {
      setImportMessage({ type: 'error', text: e?.message ?? 'Failed to fetch OMDb details.' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleLoadTmdbPosters = async () => {
    if (!selected) return;
    if (!tmdbApiKey) {
      setImportMessage({ type: 'error', text: 'TMDb API key required to fetch posters. Set it on your Profile page.' });
      return;
    }
    const parsed = parseInt(manualTmdbId.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setImportMessage({ type: 'error', text: 'Enter a valid numeric TMDb ID before loading posters.' });
      return;
    }

    try {
      setPosterLoading(true);
      setImportMessage(null);
      const posters = await getMoviePostersFromTmdb(parsed, tmdbApiKey);
      if (!posters.length) {
        setImportMessage({ type: 'error', text: 'No posters returned from TMDb for this id.' });
        return;
      }
      setPosterChoices(posters);
      setPosterModalOpen(true);
    } catch (e: any) {
      setImportMessage({ type: 'error', text: e?.message ?? 'Failed to fetch TMDb posters.' });
    } finally {
      setPosterLoading(false);
    }
  };

  const handleChoosePoster = (poster: TmdbPoster) => {
    setChosenPosterUrl(poster.url);
    setPosterModalOpen(false);
  };

  const handleSaveToCatalogue = async () => {
    if (!selected) return;

    try {
      setImportLoading(true);
      setImportMessage(null);

      const moviesRef = collection(db, 'movies');
      const imdbId = selected.imdbID;
      const snap = await getDocs(query(moviesRef, where('imdbId', '==', imdbId)));

      const basePayload: any = {
        ...formatOmdbMovie(selected),
        updatedAt: new Date(),
      };

      const parsedTmdb = manualTmdbId.trim() ? parseInt(manualTmdbId.trim(), 10) : NaN;
      if (Number.isFinite(parsedTmdb)) {
        basePayload.tmdbId = parsedTmdb;
      }
      if (chosenPosterUrl) {
        basePayload.posterUrl = chosenPosterUrl;
      }

      if (snap.empty) {
        await addDoc(moviesRef, {
          ...basePayload,
          addedAt: new Date(),
        });
      } else {
        const docId = snap.docs[0].id;
        await setDoc(doc(db, 'movies', docId), basePayload, { merge: true });
      }

      setImportMessage({ type: 'success', text: `Catalogue updated: ${selected.Title}` });
      setSelected(null);
      setManualTmdbId('');
      setChosenPosterUrl(null);
      setPosterChoices([]);
      setPosterModalOpen(false);
      setSearchPanelKey((prev) => prev + 1);
    } catch (e: any) {
      setImportMessage({ type: 'error', text: e?.message ?? 'Failed to save movie to catalogue.' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportCatalogueCsv = async () => {
    try {
      setError(null);
      setExportingCsv(true);

      const snapshot = await getDocs(collection(db, 'movies'));
      const rows: string[] = [];
      rows.push('Title,IMDb ID,Year');

      const escapeCell = (value: string | null | undefined) => {
        const s = (value ?? '').toString();
        const needsQuotes = /[",\n]/.test(s);
        const escaped = s.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      snapshot.forEach(docSnap => {
        const data: any = docSnap.data();
        const title = data.title || '';
        const imdbId = data.imdbId || '';
        let year = '';
        if (data.releaseDate) {
          try {
            const d = data.releaseDate?.toDate ? data.releaseDate.toDate() : new Date(data.releaseDate);
            if (!isNaN(d.getTime())) {
              year = String(d.getFullYear());
            } else if (typeof data.releaseDate === 'string') {
              year = data.releaseDate.slice(0, 4);
            }
          } catch {
            if (typeof data.releaseDate === 'string') {
              year = data.releaseDate.slice(0, 4);
            }
          }
        }

        rows.push([
          escapeCell(title),
          escapeCell(imdbId),
          escapeCell(year),
        ].join(','));
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'movies_catalogue.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting catalogue CSV:', err);
      setError(err.message || 'Failed to export catalogue CSV');
    } finally {
      setExportingCsv(false);
    }
  };

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <h2 className="text-2xl font-christmas text-xmas-gold">Movie Administration</h2>
          <div className="flex flex-wrap gap-2 justify-start md:justify-end" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

          {/* Catalogue Tools (Export & Posters) */}
          <div className="card bg-xmas-card shadow-xl">
            <div className="card-body">
              <h2 className="card-title font-christmas">
                <i className="fas fa-tools text-primary mr-2"></i> Catalogue Tools
              </h2>
              <p className="mb-4 text-sm opacity-80">
                Use these tools to export your movie catalogue and manage advanced poster settings.
              </p>

              <div className="flex flex-col gap-3">
                <div>
                  <Link
                    to="/admin/posters"
                    className="btn btn-outline btn-sm w-full flex items-center gap-2 justify-center"
                  >
                    <i className="fas fa-image"></i>
                    Poster Manager
                  </Link>
                  <p className="mt-1 text-xs opacity-80">
                    Open the poster manager to review and curate artwork for catalogue movies.
                  </p>
                </div>

                <div>
                  <button
                    className="btn btn-outline btn-sm w-full flex items-center gap-2 justify-center"
                    onClick={handleExportCatalogueCsv}
                    disabled={exportingCsv}
                  >
                    {exportingCsv ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Exporting…
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-csv" />
                        Export Catalogue CSV
                      </>
                    )}
                  </button>
                  <p className="mt-1 text-xs opacity-80">
                    Download a CSV snapshot of your current movies catalogue for backup or analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Import & Posters (full width) */}
        <div className="card bg-xmas-card shadow-xl overflow-visible no-card-hover">
          <div className="card-body">
            <h2 className="card-title font-christmas">
              <i className="fas fa-file-import text-primary mr-2"></i> Import & Posters
            </h2>
            <p className="mb-4 text-sm opacity-80">
              Import or update catalogue movies via OMDb or Excel, and attach TMDb ids and posters.
            </p>

            {importMessage && (
              <div
                className={`alert ${
                  importMessage.type === 'error' ? 'alert-error' : 'alert-success'
                } mb-4`}
              >
                <i
                  className={`fas ${
                    importMessage.type === 'error'
                      ? 'fa-exclamation-circle'
                      : 'fa-check-circle'
                  } mr-2`}
                />
                <span>{importMessage.text}</span>
              </div>
            )}

            <div className="tabs tabs-boxed mb-6">
              <button
                className={`tab ${importActive === 'single' ? 'tab-active' : ''}`}
                onClick={() => setImportActive('single')}
              >
                <i className="fas fa-search mr-2" />
                Single OMDb Import
              </button>
              <button
                className={`tab ${importActive === 'excel' ? 'tab-active' : ''}`}
                onClick={() => setImportActive('excel')}
              >
                <i className="fas fa-file-excel mr-2" />
                Excel Catalogue Import
              </button>
            </div>

            {importActive === 'single' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div>
                  {!omdbApiKey && (
                    <div className="alert alert-warning mb-4">
                      <i className="fas fa-exclamation-triangle mr-2" />
                      <span>Set your OMDb API key in Profile to search OMDb.</span>
                    </div>
                  )}
                  <h3 className="font-christmas text-xl mb-4 text-xmas-gold">Search OMDb</h3>
                  <TmdbSearchPanel
                    key={searchPanelKey}
                    omdbApiKey={omdbApiKey}
                    onSelect={handleSelectSearchResult}
                  />
                </div>

                <div>
                  <h3 className="font-christmas text-xl mb-4 text-xmas-gold">Selected Movie</h3>
                  {!selected ? (
                    <p className="text-sm opacity-80">
                      Search OMDb on the left and choose a result to review details, attach a TMDb id, and pick a poster.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-24 shrink-0">
                          {chosenPosterUrl || (selected as any).Poster ? (
                            <img
                              src={chosenPosterUrl || (selected as any).Poster}
                              alt={selected.Title}
                              className="w-full rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-36 bg-base-200 flex items-center justify-center rounded-lg">
                              <i className="fas fa-film text-2xl opacity-50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold mb-1">{selected.Title}</h4>
                          <p className="text-sm opacity-80 mb-1">{selected.Year}</p>
                          {selected.Plot && (
                            <p className="text-sm opacity-80 line-clamp-4">{selected.Plot}</p>
                          )}
                        </div>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">TMDb ID (manual)</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          value={manualTmdbId}
                          onChange={(e) => setManualTmdbId(e.target.value)}
                          placeholder="e.g. 603692"
                        />
                        <label className="label">
                          <span className="label-text-alt">
                            This id is stored on the catalogue movie and used by the poster tools.
                          </span>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm sm:btn-md"
                          onClick={handleLoadTmdbPosters}
                          disabled={posterLoading}
                        >
                          {posterLoading ? (
                            <>
                              <span className="loading loading-spinner loading-xs mr-2" />
                              Loading TMDb posters…
                            </>
                          ) : (
                            <>
                              <i className="fas fa-photo-video mr-2" />
                              Posters
                            </>
                          )}
                        </button>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          className="btn btn-primary w-full sm:w-auto"
                          onClick={handleSaveToCatalogue}
                          disabled={importLoading}
                        >
                          {importLoading ? (
                            <span className="loading loading-spinner loading-sm mr-2" />
                          ) : (
                            <i className="fas fa-save mr-2" />
                          )}
                          Save to Catalogue
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {importActive === 'excel' && (
              <div className="mt-4">
                {!omdbApiKey && (
                  <div className="alert alert-warning mb-4">
                    <i className="fas fa-exclamation-triangle mr-2" />
                    <span>OMDb key required for matching.</span>
                  </div>
                )}
                {omdbApiKey && (
                  <ExcelCatalogueImportWizard
                    omdbApiKey={omdbApiKey}
                    onDone={() => {
                      setImportMessage({ type: 'success', text: 'Excel catalogue import completed.' });
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {posterModalOpen && posterChoices.length > 0 && (
          <dialog className="modal modal-open">
            <div className="modal-box max-w-5xl bg-xmas-card">
              <h3 className="font-bold text-lg mb-2">Choose a TMDb poster</h3>
              <p className="text-xs opacity-80 mb-4">
                These posters come from The Movie Database for the TMDb id you entered.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
                {posterChoices.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    className="border border-transparent hover:border-xmas-gold rounded-lg overflow-hidden bg-gray-900 focus:outline-none focus:ring-2 focus:ring-xmas-gold"
                    onClick={() => handleChoosePoster(p)}
                  >
                    <img
                      src={p.url}
                      alt="TMDb poster option"
                      className="w-full h-auto object-cover"
                      style={{ aspectRatio: '2/3' }}
                    />
                  </button>
                ))}
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    setPosterModalOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </dialog>
        )}
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
                      <th>IMDb</th>
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
                            {req.imdbId && (
                              <div className="text-xs">ID: {req.imdbId}</div>
                            )}
                            {req.imdbUrl && (
                              <a
                                href={req.imdbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary text-xs"
                              >
                                View IMDb
                              </a>
                            )}
                          </td>
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
