// src/pages/AdminImportPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import OmdbSearchPanel from '../components/imports/OmdbSearchPanel';
import { OmdbMovie } from '../types/movie';
import { getMovieDetailsOmdb, formatOmdbMovie } from '../services/omdbService';
import ExcelCatalogueImportWizard from '../components/imports/ExcelCatalogueImportWizard';
import { getMoviePostersFromTmdb, TmdbPoster } from '../services/tmdbService';

const AdminImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  const { userProfile } = useAuth();

  const [omdbApiKey, setOmdbApiKey] = useState('');
  const [tmdbApiKey, setTmdbApiKey] = useState('');

  const [active, setActive] = useState<'single' | 'excel'>('single');
  const [selected, setSelected] = useState<OmdbMovie | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [manualTmdbId, setManualTmdbId] = useState('');
  const [posterChoices, setPosterChoices] = useState<TmdbPoster[]>([]);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [chosenPosterUrl, setChosenPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!adminCheckLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  useEffect(() => {
    if (userProfile?.omdbApiKey) {
      setOmdbApiKey(userProfile.omdbApiKey);
    }
    if (userProfile?.tmdbApiKey) {
      setTmdbApiKey(userProfile.tmdbApiKey);
    }
  }, [userProfile]);

  const handleSelectSearchResult = async (movieLike: OmdbMovie) => {
    if (!omdbApiKey) {
      setMessage({ type: 'error', text: 'OMDb API key required to fetch details.' });
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const details = await getMovieDetailsOmdb(movieLike.imdbID, omdbApiKey);
      setSelected(details);
      setManualTmdbId('');
      setChosenPosterUrl(null);
      setPosterChoices([]);
      setPosterModalOpen(false);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message ?? 'Failed to fetch OMDb details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTmdbPosters = async () => {
    if (!selected) return;
    if (!tmdbApiKey) {
      setMessage({ type: 'error', text: 'TMDb API key required to fetch posters. Set it on your Profile page.' });
      return;
    }
    const parsed = parseInt(manualTmdbId.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setMessage({ type: 'error', text: 'Enter a valid numeric TMDb ID before loading posters.' });
      return;
    }

    try {
      setPosterLoading(true);
      setMessage(null);
      const posters = await getMoviePostersFromTmdb(parsed, tmdbApiKey);
      if (!posters.length) {
        setMessage({ type: 'error', text: 'No posters returned from TMDb for this id.' });
        return;
      }
      setPosterChoices(posters);
      setPosterModalOpen(true);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message ?? 'Failed to fetch TMDb posters.' });
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
      setLoading(true);
      setMessage(null);

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
        setMessage({ type: 'success', text: 'Catalogue movie created.' });
      } else {
        const docId = snap.docs[0].id;
        await setDoc(doc(db, 'movies', docId), basePayload, { merge: true });
        setMessage({ type: 'success', text: 'Catalogue movie updated.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message ?? 'Failed to save movie to catalogue.' });
    } finally {
      setLoading(false);
    }
  };

  if (adminCheckLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">
            Admin Import & Posters
          </h1>
          <p className="text-sm text-xmas-mute mt-1">
            Import or update catalogue movies via OMDb or Excel, and attach TMDb ids and posters in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="btn btn-outline btn-sm md:btn-md">
            <i className="fas fa-arrow-left mr-2"></i>
            Admin Dashboard
          </Link>
          <Link to="/admin/posters" className="btn btn-outline btn-sm md:btn-md">
            <i className="fas fa-image mr-2"></i>
            Poster Manager
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`alert ${
            message.type === 'error' ? 'alert-error' : 'alert-success'
          } mb-4`}
        >
          <i
            className={`fas ${
              message.type === 'error'
                ? 'fa-exclamation-circle'
                : 'fa-check-circle'
            } mr-2`}
          />
          <span>{message.text}</span>
        </div>
      )}

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${active === 'single' ? 'tab-active' : ''}`}
          onClick={() => setActive('single')}
        >
          <i className="fas fa-search mr-2" />
          Single OMDb Import
        </button>
        <button
          className={`tab ${active === 'excel' ? 'tab-active' : ''}`}
          onClick={() => setActive('excel')}
        >
          <i className="fas fa-file-excel mr-2" />
          Excel Catalogue Import
        </button>
      </div>

      {active === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
            {!omdbApiKey && (
              <div className="alert alert-warning mb-4">
                <i className="fas fa-exclamation-triangle mr-2" />
                <span>Set your OMDb API key in Profile to search OMDb.</span>
              </div>
            )}
            <h2 className="font-christmas text-2xl mb-4 text-xmas-gold">Search OMDb</h2>
            <OmdbSearchPanel omdbApiKey={omdbApiKey} onSelect={handleSelectSearchResult} />
          </div>

          <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
            <h2 className="font-christmas text-2xl mb-4 text-xmas-gold">Selected Movie</h2>
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
                    <h3 className="text-xl font-bold mb-1">{selected.Title}</h3>
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
                        Load TMDb posters
                      </>
                    )}
                  </button>
                  {chosenPosterUrl && (
                    <span className="text-xs opacity-80 truncate max-w-xs">
                      Using poster: {chosenPosterUrl}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={handleSaveToCatalogue}
                    disabled={loading}
                  >
                    {loading ? (
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

      {active === 'excel' && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!omdbApiKey && (
            <div className="alert alert-warning mb-4">
              <i className="fas fa-exclamation-triangle mr-2" />
              <span>OMDb key required for matching.</span>
            </div>
          )}
          {omdbApiKey && (
            <ExcelCatalogueImportWizard
              omdbApiKey={omdbApiKey}
              tmdbApiKey={tmdbApiKey}
              onDone={() => {
                setMessage({ type: 'success', text: 'Excel catalogue import completed.' });
              }}
            />
          )}
        </div>
      )}

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
  );
};

export default AdminImportPage;
