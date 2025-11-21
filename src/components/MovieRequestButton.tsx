import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const MovieRequestButton: React.FC = () => {
  const { currentUser, userProfile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [tmdbId, setTmdbId] = useState<string>('');
  const [tmdbUrl, setTmdbUrl] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tmdbId && !tmdbUrl) {
      setTmdbUrl(`https://www.themoviedb.org/movie/${tmdbId}`);
    }
  }, [tmdbId, tmdbUrl]);

  const resetForm = () => {
    setTitle('');
    setTmdbId('');
    setTmdbUrl('');
    setYear('');
    setNotes('');
    setError(null);
  };

  const handleOpen = () => {
    setError(null);
    setSuccess(null);
    if (!currentUser) {
      setError('Please sign in to request a movie.');
      return;
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be signed in to submit a request.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a movie title.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await addDoc(collection(db, 'Requests'), {
        title: title.trim(),
        tmdbId: tmdbId ? Number(tmdbId) : null,
        tmdbUrl: tmdbUrl.trim() || null,
        year: year.trim() || null,
        notes: notes.trim() || null,
        userId: currentUser.uid,
        userDisplayName: userProfile?.displayName || currentUser.displayName || null,
        status: 'pending',
        createdAt: new Date(),
      });

      setSuccess('Request submitted! Thank you.');
      resetForm();
      setIsOpen(false);
    } catch (err: any) {
      console.error('Failed to submit movie request:', err);
      setError(err?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm sm:btn-md mb-4"
        onClick={handleOpen}
      >
        <i className="fas fa-gift mr-2" />
        Request a movie
      </button>

      {error && !isOpen && (
        <div className="alert alert-warning mb-4">
          <i className="fas fa-exclamation-triangle mr-2" />
          <span>{error}</span>
        </div>
      )}

      {success && !isOpen && (
        <div className="alert alert-success mb-4">
          <i className="fas fa-check-circle mr-2" />
          <span>{success}</span>
        </div>
      )}

      {isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-xmas-card max-w-lg">
            <h2 className="font-christmas text-2xl mb-2 text-xmas-gold">Request a Movie</h2>
            <p className="text-sm mb-4 opacity-80">
              Can&apos;t find a movie in the catalogue? Tell us about it so we can add it.
            </p>

            {error && (
              <div className="alert alert-error mb-3">
                <i className="fas fa-exclamation-circle mr-2" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="label">
                  <span className="label-text">Movie title *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="e.g. The Grinch"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    <span className="label-text">TMDB ID (optional)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={tmdbId}
                    onChange={(e) => setTmdbId(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. 8871"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Release year (optional)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">TMDB URL (optional)</span>
                </label>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  value={tmdbUrl}
                  onChange={(e) => setTmdbUrl(e.target.value)}
                  disabled={submitting}
                  placeholder="https://www.themoviedb.org/movie/..."
                />
                <p className="text-xs opacity-70 mt-1">
                  If you provide a TMDB ID, the URL will be auto-filled. You can also paste a URL directly.
                </p>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Anything else that helps? (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  placeholder="Actors, streaming service, or where you heard about it."
                />
              </div>

              <div className="modal-action flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting && (
                    <span className="loading loading-spinner loading-sm mr-2" />
                  )}
                  Submit request
                </button>
              </div>
            </form>

            <form method="dialog" className="modal-backdrop" onClick={handleClose}>
              <button>close</button>
            </form>
          </div>
        </dialog>
      )}
    </>
  );
};

export default MovieRequestButton;
