import React from 'react';
import { posterSrc } from '../../utils/matching';

interface MovieImportModalProps {
  selected: any;
  showDetails: boolean;
  loading: boolean;
  onToggleDetails: () => void;
  onAdd: () => void;
  onClose: () => void;
}

const MovieImportModal: React.FC<MovieImportModalProps> = ({
  selected,
  showDetails,
  loading,
  onToggleDetails,
  onAdd,
  onClose,
}) => {
  if (!selected) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-xmas-card">
        <div className="flex gap-4">
          <div className="w-24 shrink-0">
            {posterSrc(selected) ? (
              <img
                src={posterSrc(selected)!}
                alt={selected.title}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="w-full h-36 bg-base-200 flex items-center justify-center rounded-lg">
                <i className="fas fa-film text-2xl opacity-50" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">{selected.title}</h2>
            <p className="text-sm opacity-80 mb-1">
              {selected.release_date?.slice(0, 4)}
            </p>
            {!showDetails && selected.runtime && (
              <p className="text-sm opacity-80 mb-1">
                Runtime: {selected.runtime} min
              </p>
            )}

            {showDetails && (
              <div className="mt-3 space-y-2 text-sm opacity-90 max-h-48 overflow-auto pr-1">
                {selected.overview && (
                  <div>
                    <p className="font-semibold mb-1">Overview</p>
                    <p>{selected.overview}</p>
                  </div>
                )}
                {selected.runtime && (
                  <p>
                    <span className="font-semibold">Runtime:</span> {selected.runtime} min
                  </p>
                )}
                {selected.genres && selected.genres.length > 0 && (
                  <p>
                    <span className="font-semibold">Genres:</span>{' '}
                    {selected.genres
                      .map((g: any) => (typeof g === 'string' ? g : g.name))
                      .join(', ')}
                  </p>
                )}
                {(selected.credits?.cast?.length || selected.cast?.length) && (
                  <p>
                    <span className="font-semibold">Top cast:</span>{' '}
                    {(selected.credits?.cast && selected.credits.cast.length > 0
                      ? selected.credits.cast.map((c: any) => c.name)
                      : selected.cast
                    )
                      .slice(0, 5)
                      .join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {(selected.overview || selected.runtime || selected.genres || selected.credits || selected.cast) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm sm:btn-md gap-2"
                  onClick={onToggleDetails}
                  disabled={loading}
                >
                  <i className="fas fa-info-circle" />
                  {showDetails ? 'Hide details' : 'View details'}
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-primary btn-sm sm:btn-md"
                onClick={onAdd}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm mr-2" />
                ) : (
                  <i className="fas fa-plus mr-2" />
                )}
                Add Movie
              </button>
              <button
                className="btn btn-outline btn-sm sm:btn-md"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Backdrop closes modal */}
        <form
          method="dialog"
          className="modal-backdrop"
          onClick={onClose}
        >
          <button>close</button>
        </form>
      </div>
    </dialog>
  );
};

export default MovieImportModal;
