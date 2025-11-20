import React from 'react';
import VibeReview from './VibeReview';

interface UserRatingReviewProps {
  watched: boolean;
  watchedDate: string;
  onWatchedDateChange: (value: string) => void;
  rating: number | null;
  onRatingChange: (value: number | null) => void;
  review: string;
  onReviewChange: (value: string) => void;
  vibeTags: string[];
  onVibeChange: (data: { tags: string[]; autoReview: string }) => void;
  saving: boolean;
  onSave: () => void;
}

const UserRatingReview: React.FC<UserRatingReviewProps> = ({
  watched,
  watchedDate,
  onWatchedDateChange,
  rating,
  onRatingChange,
  review,
  onReviewChange,
  vibeTags,
  onVibeChange,
  saving,
  onSave,
}) => {
  return (
    <>
      <h2 className="text-2xl font-christmas text-xmas-gold mb-4">Your Rating &amp; Review</h2>

      {watched && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Date Watched</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={watchedDate}
            onChange={(e) => onWatchedDateChange(e.target.value)}
          />
        </div>
      )}

      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Your Rating</span>
        </label>
        <div className="rating rating-lg">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <input
              key={value}
              type="radio"
              name="rating"
              className={`mask mask-star-2 ${value <= 5 ? 'bg-orange-400' : 'bg-yellow-400'}`}
              checked={rating === value}
              onChange={() => onRatingChange(value)}
            />
          ))}
        </div>
        {rating && (
          <div className="mt-2">
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => onRatingChange(null)}
            >
              Clear Rating
            </button>
          </div>
        )}
      </div>

      <VibeReview
        rating={rating}
        initialTags={vibeTags}
        initialAutoReview={review}
        onChange={onVibeChange}
      />

      <div className="form-control mb-6 mt-4">
        <label className="label">
          <span className="label-text">Your Review</span>
        </label>
        <textarea
          className="textarea textarea-bordered h-32"
          placeholder="Write your thoughts about this movie..."
          value={review}
          onChange={(e) => onReviewChange(e.target.value)}
        ></textarea>
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-primary btn-sm sm:btn-md"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Save Changes
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default UserRatingReview;
