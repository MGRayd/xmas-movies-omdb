import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie, UserMovie } from '../types/movie';
import { ACHIEVEMENTS } from './achievements.data';

export { ACHIEVEMENTS };

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  check: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalWatched: number;
  totalRated: number;
  averageRating: number;
  lowRatingAny: boolean;
  highRatingAny: boolean;
  lowRatingCount: number;
  highRatingCount: number;
  classicWatched: number;
  romanceCount: number;
  animatedCount: number;
  favoriteCount: number;
  genreVariety: number;
  decadeVariety: number;
  maxRewatchCount: number;
  maxWatchedInDay: number;
  usageDistinctDays: number;
  decemberDistinctDays: number;
  hasChristmasEveWatch: boolean;
  hasNewYearsWatch: boolean;
  hasTwelveDayStreak: boolean;
  hasWeekendDouble: boolean;
  hasPreDecemberWatch: boolean;
  hasYearlyRewatch: boolean;
}

export interface UserAchievementDoc {
  id: string;
  unlockedAt: Date;
  seen: boolean;
}

function toDateLike(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date((value as any).seconds * 1000);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function buildStats(userMovies: UserMovie[], moviesById: Record<string, Movie>): UserStats {
  let totalWatched = 0;
  let totalRated = 0;
  let ratingSum = 0;
  let classicWatched = 0;
  let romanceCount = 0;
  let animatedCount = 0;
  let favoriteCount = 0;
  let lowRatingAny = false;
  let highRatingAny = false;
  let lowRatingCount = 0;
  let highRatingCount = 0;
  const genreSet = new Set<string>();
  const decadeSet = new Set<number>();
  let maxRewatchCount = 0;
  const dayWatchCounts: Record<string, number> = {};
  const watchYearsByMovie: Record<string, Set<number>> = {};
  let maxWatchedInDay = 0;
  const decemberDays = new Set<string>();
  const usageDays = new Set<string>();
  const watchedDays = new Set<string>();

  for (const um of userMovies) {
    if (um.watched) {
      totalWatched++;

      // Derive maxRewatchCount from per-movie rewatchCount, falling back to 1
      const rc = (um as any).rewatchCount;
      const effectiveCount = typeof rc === 'number' && rc > 0 ? rc : 1;
      if (effectiveCount > maxRewatchCount) {
        maxRewatchCount = effectiveCount;
      }

      const watchedDate = toDateLike((um as any).watchedDate);
      if (watchedDate) {
        const key = watchedDate.toISOString().split('T')[0];
        watchedDays.add(key);
        const dayCount = (dayWatchCounts[key] ?? 0) + 1;
        dayWatchCounts[key] = dayCount;
        if (dayCount > maxWatchedInDay) {
          maxWatchedInDay = dayCount;
        }
        const month = watchedDate.getMonth();
        const day = watchedDate.getDate();
        if (month === 11) {
          decemberDays.add(key);
        }
        if (month === 11 && day === 24) {
          /* Christmas Eve */
        }
      }

      const movie = moviesById[um.movieId];
      if (movie && movie.releaseDate) {
        const rd = movie.releaseDate;
        let year: number | null = null;

        // If the string starts with a 4-digit year, use that directly
        if (/^\d{4}/.test(rd)) {
          year = Number(rd.substring(0, 4));
        } else {
          // Fallback: let Date parse formats like "13 Dec 2015"
          const parsed = new Date(rd);
          if (!isNaN(parsed.getTime())) {
            year = parsed.getFullYear();
          }
        }

        if (year !== null && year < 2000) {
          classicWatched++;
        }

        if (year !== null) {
          const decade = Math.floor(year / 10) * 10;
          decadeSet.add(decade);
        }
      }
      if (movie && movie.genres) {
        for (const g of movie.genres) {
          genreSet.add(g);
        }
        if (movie.genres.includes('Romance')) {
          romanceCount++;
        }
        if (movie.genres.includes('Animation')) {
          animatedCount++;
        }
      }

      if (um.movieId) {
        const yearsForThisMovie = new Set<number>();
        if (watchedDate) {
          yearsForThisMovie.add(watchedDate.getUTCFullYear());
        }
        const lastWatchedDate = toDateLike((um as any).lastWatchedDate);
        if (lastWatchedDate) {
          yearsForThisMovie.add(lastWatchedDate.getUTCFullYear());
        }
        if (yearsForThisMovie.size > 0) {
          if (!watchYearsByMovie[um.movieId]) {
            watchYearsByMovie[um.movieId] = new Set<number>();
          }
          for (const y of yearsForThisMovie) {
            watchYearsByMovie[um.movieId].add(y);
          }
        }
      }
    }

    if (um.favorite) {
      favoriteCount++;
    }

    if (typeof um.rating === 'number') {
      totalRated++;
      ratingSum += um.rating;
      if (um.rating <= 1) {
        lowRatingAny = true;
      }
      if (um.rating >= 10) {
        highRatingAny = true;
      }
      if (um.rating <= 2) {
        lowRatingCount++;
      }
      if (um.rating >= 8) {
        highRatingCount++;
      }
    }

    const activityDate = toDateLike((um as any).updatedAt || (um as any).addedAt);
    if (activityDate) {
      const key = activityDate.toISOString().split('T')[0];
      usageDays.add(key);
    }
  }

  const allWatchedDayNumbers = Array.from(watchedDays).map((d) => {
    const date = new Date(d + 'T00:00:00Z');
    return Math.floor(date.getTime() / 86400000);
  }).sort((a, b) => a - b);

  let hasTwelveDayStreak = false;
  let currentStreak = 0;
  let prevDay: number | null = null;

  for (const dayNum of allWatchedDayNumbers) {
    if (prevDay === null || dayNum === prevDay + 1) {
      currentStreak += 1;
    } else if (dayNum !== prevDay) {
      currentStreak = 1;
    }
    if (currentStreak >= 12) {
      hasTwelveDayStreak = true;
      break;
    }
    prevDay = dayNum;
  }

  let hasChristmasEveWatch = false;
  let hasNewYearsWatch = false;
  let hasWeekendDouble = false;
  let hasPreDecemberWatch = false;
  let hasYearlyRewatch = false;
  for (const d of watchedDays) {
    const date = new Date(d + 'T00:00:00Z');
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const weekday = date.getUTCDay();
    if (month === 11 && day === 24) {
      hasChristmasEveWatch = true;
    }
    if (month === 0 && day === 1) {
      hasNewYearsWatch = true;
    }

    if (month < 11) {
      hasPreDecemberWatch = true;
    }

    if (!hasWeekendDouble) {
      if (weekday === 6) {
        // Saturday: check next day for Sunday in watchedDays
        const next = new Date(date.getTime());
        next.setUTCDate(next.getUTCDate() + 1);
        const keyNext = next.toISOString().split('T')[0];
        if (watchedDays.has(keyNext)) {
          const nextWeekday = next.getUTCDay();
          if (nextWeekday === 0) {
            hasWeekendDouble = true;
          }
        }
      } else if (weekday === 0) {
        // Sunday: check previous day for Saturday in watchedDays
        const prev = new Date(date.getTime());
        prev.setUTCDate(prev.getUTCDate() - 1);
        const keyPrev = prev.toISOString().split('T')[0];
        if (watchedDays.has(keyPrev)) {
          const prevWeekday = prev.getUTCDay();
          if (prevWeekday === 6) {
            hasWeekendDouble = true;
          }
        }
      }
    }
  }

  for (const movieId of Object.keys(watchYearsByMovie)) {
    if (watchYearsByMovie[movieId].size >= 2) {
      hasYearlyRewatch = true;
      break;
    }
  }

  const averageRating = totalRated > 0 ? ratingSum / totalRated : 0;

  return {
    totalWatched,
    totalRated,
    averageRating,
    lowRatingAny,
    highRatingAny,
    lowRatingCount,
    highRatingCount,
    classicWatched,
    romanceCount,
    animatedCount,
    favoriteCount,
    genreVariety: genreSet.size,
    decadeVariety: decadeSet.size,
    maxRewatchCount,
    maxWatchedInDay,
    usageDistinctDays: usageDays.size,
    decemberDistinctDays: decemberDays.size,
    hasChristmasEveWatch,
    hasNewYearsWatch,
    hasTwelveDayStreak,
    hasWeekendDouble,
    hasPreDecemberWatch,
    hasYearlyRewatch,
  };
}

export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  const userMoviesSnap = await getDocs(collection(db, `users/${userId}/movies`));
  const userMoviesRaw: UserMovie[] = [];
  const movieIds = new Set<string>();

  userMoviesSnap.forEach((d) => {
    const data = d.data() as any;
    userMoviesRaw.push({ id: d.id, ...data } as UserMovie);
    if (data.movieId) {
      movieIds.add(data.movieId);
    }
  });

  const moviesById: Record<string, Movie> = {};
  if (movieIds.size) {
    const batchIds = Array.from(movieIds);
    for (const id of batchIds) {
      const snap = await getDocs(collection(db, 'movies'));
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        moviesById[docSnap.id] = { id: docSnap.id, ...data } as Movie;
      });
      break;
    }
  }

  // Check if the user has recently reset achievements; if so, ignore
  // activity prior to that reset when computing stats so that badges
  // do not immediately re-unlock from historical data.
  let resetAfter: Date | null = null;
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const data = userSnap.data() as any;
      if (data.achievementsResetAfter) {
        resetAfter = toDateLike(data.achievementsResetAfter);
      }
    }
  } catch (e) {
    console.error('Error loading achievements reset meta', e);
  }

  let userMovies = userMoviesRaw;
  if (resetAfter) {
    userMovies = userMoviesRaw.filter((um) => {
      const activityDate = toDateLike((um as any).updatedAt || (um as any).addedAt || (um as any).watchedDate);
      return !activityDate || activityDate > resetAfter!;
    });
  }

  const stats = buildStats(userMovies, moviesById);

  const achievementsCol = collection(db, `users/${userId}/achievements`);
  const unlockedSnap = await getDocs(achievementsCol);
  const alreadyUnlocked = new Set<string>();
  unlockedSnap.forEach((d) => alreadyUnlocked.add(d.id));

  const newlyUnlocked: string[] = [];

  for (const a of ACHIEVEMENTS) {
    if (!alreadyUnlocked.has(a.id) && a.check(stats)) {
      newlyUnlocked.push(a.id);
      await setDoc(doc(db, `users/${userId}/achievements`, a.id), {
        unlockedAt: new Date(),
        seen: false,
      });
    }
  }

  return newlyUnlocked;
}
