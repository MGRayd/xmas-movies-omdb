import React, { useEffect, useState } from "react";

type TagType = "positive" | "negative";

interface TagDef {
  id: string;
  label: string;
  emoji: string;
  type: TagType;
}

interface VibeReviewProps {
  rating: number | null; // 1–10
  initialTags?: string[];
  initialAutoReview?: string;
  onChange?: (data: { tags: string[]; autoReview: string }) => void;
}

const POSITIVE_TAGS: TagDef[] = [
  { id: "heartwarming", label: "Heartwarming", emoji: "❤️", type: "positive" },
  { id: "very_christmassy", label: "Very Christmassy", emoji: "🎄", type: "positive" },
  { id: "snowy", label: "Snowy Setting", emoji: "🌨️", type: "positive" },
  { id: "funny", label: "Funny", emoji: "😂", type: "positive" },
  { id: "cheesy", label: "Cheesy (Good Way)", emoji: "🧀", type: "positive" },
  { id: "romantic", label: "Romantic", emoji: "🥰", type: "positive" },
  { id: "family_friendly", label: "Family Friendly", emoji: "👨‍👩‍👧‍👦", type: "positive" },
  { id: "background", label: "Good Background Watch", emoji: "📺", type: "positive" },
  { id: "tearjerker", label: "Emotional", emoji: "😭", type: "positive" },
  { id: "rewatch", label: "Would Rewatch", emoji: "🔁", type: "positive" },
];

const NEGATIVE_TAGS: TagDef[] = [
  { id: "slow", label: "Slow Pacing", emoji: "🐌", type: "negative" },
  { id: "boring", label: "A Bit Boring", emoji: "🥱", type: "negative" },
  { id: "low_christmas", label: "Low Xmas Vibes", emoji: "🎄❌", type: "negative" },
  { id: "weak_chemistry", label: "Weak Chemistry", emoji: "💔", type: "negative" },
  { id: "confusing", label: "Confusing Plot", emoji: "❓", type: "negative" },
  { id: "too_long", label: "Too Long", emoji: "⏳", type: "negative" },
  { id: "cringey", label: "Cringey", emoji: "😬", type: "negative" },
  { id: "fake_snow", label: "Fake Snow", emoji: "🌨️❌", type: "negative" },
  { id: "hammy", label: "Hammy", emoji: "😬", type: "negative" },
];

const ALL_TAGS: TagDef[] = [...POSITIVE_TAGS, ...NEGATIVE_TAGS];

const POSITIVE_PHRASES: Record<string, string> = {
  heartwarming: "heartwarming",
  very_christmassy: "full of Christmas vibes",
  snowy: "with a lovely snowy setting",
  funny: "with some funny moments",
  cheesy: "a bit cheesy in a good way",
  romantic: "with sweet romantic moments",
  family_friendly: "very family friendly",
  background: "great as a cosy background watch",
  tearjerker: "quite emotional at times",
  rewatch: "something I'd happily rewatch",
};

const NEGATIVE_PHRASES: Record<string, string> = {
  slow: "quite slow in places",
  boring: "a bit boring overall",
  low_christmas: "lighter on Christmas vibes than expected",
  weak_chemistry: "with weak chemistry between the leads",
  confusing: "a bit confusing at times",
  too_long: "longer than it needed to be",
  cringey: "a bit cringey in parts",
  fake_snow: "with fake snow",
  hammy: "hammy overacting",
};

function buildRatingSentence(rating: number | null): string {
  if (!rating || rating <= 0) {
    return "An easy-going Christmas movie.";
  }

  if (rating >= 9) {
    return "Absolutely loved this Christmas movie.";
  }
  if (rating >= 8) {
    return "Really enjoyed this festive watch.";
  }
  if (rating >= 7) {
    return "A good Christmas movie I liked overall.";
  }
  if (rating >= 6) {
    return "A decent cosy watch with some nice moments.";
  }
  if (rating >= 5) {
    return "An okay Christmas movie, but nothing special.";
  }
  if (rating >= 3) {
    return "Not really my thing, it had a few issues.";
  }
  return "I didn't enjoy this Christmas movie very much.";
}

function formatList(phrases: string[]): string {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];
  const last = phrases[phrases.length - 1];
  const rest = phrases.slice(0, -1);
  return `${rest.join(", ")} and ${last}`;
}

function buildTagSentences(selectedTagIds: string[]): string {
  const positives = selectedTagIds
    .map((id) => POSITIVE_PHRASES[id])
    .filter(Boolean);

  const negatives = selectedTagIds
    .map((id) => NEGATIVE_PHRASES[id])
    .filter(Boolean);

  let result = "";

  if (positives.length) {
    result += ` It felt ${formatList(positives)}.`;
  }

  if (negatives.length) {
    result += ` However, it was ${formatList(negatives)}.`;
  }

  return result;
}

const VibeReview: React.FC<VibeReviewProps> = ({
  rating,
  initialTags = [],
  initialAutoReview = "",
  onChange,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [autoReview, setAutoReview] = useState<string>(initialAutoReview);

  useEffect(() => {
    setSelectedTags(initialTags);
  }, [initialTags.join("|")]);

  useEffect(() => {
    setAutoReview(initialAutoReview);
  }, [initialAutoReview]);

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    const ratingSentence = buildRatingSentence(rating);
    const tagSentences = buildTagSentences(selectedTags);
    const text = (ratingSentence + tagSentences).trim();

    setAutoReview(text);

    if (onChange) {
      onChange({
        tags: selectedTags,
        autoReview: text,
      });
    }
  };

  const isSelected = (id: string) => selectedTags.includes(id);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-primary">Quick Vibe Review</h3>
        <span className="text-xs opacity-80">
          Pick a few that fit, then generate.
        </span>
      </div>

      {/* Positive tags */}
      <p className="text-xs mb-1 opacity-80">What worked?</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {POSITIVE_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`btn btn-xs rounded-full border ${
              isSelected(tag.id)
                ? "btn-accent text-base-100"
                : "btn-ghost border-base-300 text-sm"
            }`}
          >
            <span className="mr-1">{tag.emoji}</span>
            {tag.label}
          </button>
        ))}
      </div>

      {/* Negative tags */}
      <p className="text-xs mb-1 opacity-80">What didn&apos;t?</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {NEGATIVE_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`btn btn-xs rounded-full border ${
              isSelected(tag.id)
                ? "btn-error text-base-100"
                : "btn-ghost border-base-300 text-sm"
            }`}
          >
            <span className="mr-1">{tag.emoji}</span>
            {tag.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        className="btn btn-sm btn-primary"
      >
        ✨ Generate Review From Tags
      </button>

      {autoReview && (
        <p className="mt-3 text-sm opacity-90 italic">
          Generated preview: “{autoReview}”
        </p>
      )}
    </div>
  );
};

export default VibeReview;
