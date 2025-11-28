import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import { getMoviePostersFromTmdb, TmdbPoster } from '../services/tmdbService';

interface MovieForPoster {
  id: string;
  title: string;
  releaseDate?: string;
  posterUrl?: string;
  tmdbId?: number;
}

const AdminPosterManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [movies, setMovies] = useState<MovieForPoster[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [tmdbLoadingId, setTmdbLoadingId] = useState<string | null>(null);
  const [tmdbPickingId, setTmdbPickingId] = useState<string | null>(null);
  const [tmdbPosters, setTmdbPosters] = useState<TmdbPoster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [posterFilter, setPosterFilter] = useState<'all' | 'with' | 'without'>('all');

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!adminCheckLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  useEffect(() => {
    const fetchMovies = async () => {
      if (!isAdmin) return;

      setLoading(true);
      setError(null);

      try {
        const snapshot = await getDocs(collection(db, 'movies'));
        const list: MovieForPoster[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          list.push({
            id: docSnap.id,
            title: data.title || '(Untitled)',
            releaseDate: data.releaseDate,
            posterUrl: data.posterUrl,
            tmdbId: data.tmdbId,
          });
        });

        list.sort((a, b) => a.title.localeCompare(b.title));
        setMovies(list);
      } catch (e: any) {
        console.error('Error loading movies for poster manager:', e);
        setError(e?.message || 'Failed to load movies');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchMovies();
    }
  }, [isAdmin]);

  const handleFileChange = (movieId: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [movieId]: file }));
  };

  const handleTriggerFileInput = (movieId: string) => {
    const input = fileInputsRef.current[movieId];
    if (input) {
      input.click();
    }
  };

  const handleUpload = async (movie: MovieForPoster) => {
    const file = files[movie.id];
    if (!file) {
      setError('Please choose an image file to upload.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setUploadingId(movie.id);

      const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : 'jpg';
      const safeTitle = (movie.title || 'movie')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

      const storageRef = ref(
        storage,
        `movies/${movie.id}/poster-${safeTitle}.${ext}`
      );
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'movies', movie.id), {
        posterUrl: downloadUrl,
        updatedAt: new Date(),
      });

      setMovies((prev) =>
        prev.map((m) =>
          m.id === movie.id ? { ...m, posterUrl: downloadUrl } : m
        )
      );

      setSuccess(`Poster updated for "${movie.title}".`);
      setFiles((prev) => ({ ...prev, [movie.id]: null }));
    } catch (e: any) {
      console.error('Error uploading poster image:', e);
      setError(e?.message || 'Failed to upload poster image');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredMovies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return movies.filter((movie) => {
      if (posterFilter === 'with' && !movie.posterUrl) return false;
      if (posterFilter === 'without' && movie.posterUrl) return false;

      if (!q) return true;

      const title = movie.title.toLowerCase();
      const year = movie.releaseDate
        ? new Date(movie.releaseDate).getFullYear().toString()
        : '';

      return (
        title.includes(q) ||
        (!!year && year.includes(q))
      );
    });
  }, [movies, searchQuery, posterFilter]);

  const tmdbApiKey = userProfile?.tmdbApiKey || '';

  const handleOpenTmdbPosters = async (movie: MovieForPoster) => {
    if (!tmdbApiKey) {
      setError('TMDb API key is required. Set it on your Profile page.');
      return;
    }

    if (!movie.tmdbId) {
      setError('No tmdbId stored for this movie.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setTmdbLoadingId(movie.id);

      const posters = await getMoviePostersFromTmdb(movie.tmdbId, tmdbApiKey);
      if (!posters.length) {
        setError('No posters returned from TMDb for this movie.');
        return;
      }

      setTmdbPosters(posters);
      setTmdbPickingId(movie.id);
    } catch (e: any) {
      console.error('Error fetching TMDb posters:', e);
      setError(e?.message || 'Failed to fetch TMDb posters');
    } finally {
      setTmdbLoadingId(null);
    }
  };

  const handleSelectTmdbPoster = async (poster: TmdbPoster) => {
    if (!tmdbPickingId) return;

    const movie = movies.find((m) => m.id === tmdbPickingId);
    if (!movie) return;

    try {
      setError(null);
      setSuccess(null);

      await updateDoc(doc(db, 'movies', movie.id), {
        posterUrl: poster.url,
        updatedAt: new Date(),
      });

      setMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? { ...m, posterUrl: poster.url } : m))
      );

      setSuccess(`TMDb poster applied for "${movie.title}".`);
      setTmdbPickingId(null);
      setTmdbPosters([]);
    } catch (e: any) {
      console.error('Error applying TMDb poster:', e);
      setError(e?.message || 'Failed to apply TMDb poster');
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">
            Poster Image Manager
          </h1>
          <p className="text-sm text-xmas-mute mt-1">
            View current posters and upload replacements stored in Firebase
            Storage.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="btn btn-outline btn-sm md:btn-md">
            <i className="fas fa-arrow-left mr-2"></i>
            Admin Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <i className="fas fa-check-circle mr-2"></i>
          <span>{success}</span>
        </div>
      )}

      {movies.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </span>
              <input
                type="text"
                className="input input-bordered input-sm md:input-md w-full pl-8 pr-8"
                placeholder="Search by title or year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="fas fa-times text-gray-400 hover:text-gray-600"></i>
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              className={`btn btn-xs md:btn-sm ${posterFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPosterFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-xs md:btn-sm ${posterFilter === 'with' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPosterFilter('with')}
            >
              With poster
            </button>
            <button
              type="button"
              className={`btn btn-xs md:btn-sm ${posterFilter === 'without' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPosterFilter('without')}
            >
              No poster
            </button>
          </div>
        </div>
      )}

      {filteredMovies.length === 0 ? (
        <p className="text-sm opacity-80">No movies found.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {filteredMovies.map((movie) => {
            const file = files[movie.id] || null;
            const year = movie.releaseDate
              ? new Date(movie.releaseDate).getFullYear()
              : undefined;

            return (
              <div
                key={movie.id}
                className="block transition-transform hover:scale-[1.02] hover:shadow-xl cursor-default"
              >
                <div className="relative rounded-lg overflow-hidden bg-xmas-card shadow-md h-full flex flex-col">
                  <div className="relative">
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-auto object-cover"
                        style={{ aspectRatio: '2/3' }}
                      />
                    ) : (
                      <div
                        className="w-full flex items-center justify-center bg-gray-800"
                        style={{ aspectRatio: '2/3' }}
                      >
                        <i className="fas fa-film text-2xl text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="p-1 sm:p-2 flex-grow flex flex-col">
                    <h2 className="text-xs sm:text-sm font-medium line-clamp-2">
                      {movie.title}
                    </h2>
                    {year && (
                      <p className="text-xs text-gray-400 mt-1">{year}</p>
                    )}
                    {movie.posterUrl && (
                      <a
                        href={movie.posterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary text-[10px] sm:text-xs mt-0.5 inline-block"
                      >
                        Open current poster
                      </a>
                    )}
                  </div>

                  <div className="px-1 sm:px-2 pb-2 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => {
                        fileInputsRef.current[movie.id] = el;
                      }}
                      className="hidden"
                      onChange={(e) =>
                        handleFileChange(
                          movie.id,
                          e.target.files && e.target.files[0]
                            ? e.target.files[0]
                            : null
                        )
                      }
                    />

                    <button
                      className="btn btn-primary btn-xs w-full"
                      type="button"
                      onClick={() => handleOpenTmdbPosters(movie)}
                      disabled={tmdbLoadingId === movie.id || !tmdbApiKey || !movie.tmdbId}
                    >
                      {tmdbLoadingId === movie.id ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-1" />
                          TMDb...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-photo-video mr-1" />
                          TMDb posters
                        </>
                      )}
                    </button>

                    <button
                      className="btn btn-outline btn-xs w-full"
                      type="button"
                      onClick={() => handleTriggerFileInput(movie.id)}
                    >
                      <i className="fas fa-file-image mr-1" />
                      Choose file
                    </button>

                    <button
                      className="btn btn-primary btn-xs w-full"
                      type="button"
                      onClick={() => handleUpload(movie)}
                      disabled={uploadingId === movie.id || !file}
                    >
                      {uploadingId === movie.id ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-1" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload mr-1" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tmdbPickingId && tmdbPosters.length > 0 && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-5xl bg-xmas-card">
            <h3 className="font-bold text-lg mb-2">Choose a TMDb poster</h3>
            <p className="text-xs opacity-80 mb-4">
              These posters come from The Movie Database for this movie&apos;s stored tmdbId.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {tmdbPosters.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  className="border border-transparent hover:border-xmas-gold rounded-lg overflow-hidden bg-gray-900 focus:outline-none focus:ring-2 focus:ring-xmas-gold"
                  onClick={() => handleSelectTmdbPoster(p)}
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
                  setTmdbPickingId(null);
                  setTmdbPosters([]);
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

export default AdminPosterManagerPage;
