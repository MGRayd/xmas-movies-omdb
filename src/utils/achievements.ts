import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie, UserMovie } from '../types/movie';

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
  classicWatched: number;
  romanceCount: number;
  animatedCount: number;
  favoriteCount: number;
  usageDistinctDays: number;
  decemberDistinctDays: number;
  hasChristmasEveWatch: boolean;
  hasNewYearsWatch: boolean;
  hasTwelveDayStreak: boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_snowflake',
    name: 'First Snowflake',
    description: 'You logged your very first watched Christmas movie.',
    hint: 'Watch 1 movie.',
    icon: '❄️',
    check: (s) => s.totalWatched >= 1,
  },
  {
    id: 'snowball_starter',
    name: 'Snowball Starter',
    description: 'You have started to build your festive watchlist.',
    hint: 'Watch 5 movies.',
    icon: '☃️',
    check: (s) => s.totalWatched >= 5,
  },
  {
    id: 'blizzard_binger',
    name: 'Blizzard Binger',
    description: 'You powered through a flurry of festive films.',
    hint: 'Watch 20 movies.',
    icon: '🌨️',
    check: (s) => s.totalWatched >= 20,
  },
  {
    id: 'christmas_marathoner',
    name: 'Christmas Marathoner',
    description: 'You turned Christmas movies into a marathon event.',
    hint: 'Watch 50 movies.',
    icon: '🏅',
    check: (s) => s.totalWatched >= 50,
  },
  {
    id: 'twelve_days',
    name: '12 Days of Christmas',
    description: 'You kept the festive streak going for 12 days.',
    hint: 'Watch a movie daily for 12 days.',
    icon: '🎄',
    check: (s) => s.hasTwelveDayStreak,
  },
  {
    id: 'the_grinch',
    name: 'The Grinch',
    description: 'Not every movie can be a Christmas miracle.',
    hint: 'Give a movie 1★.',
    icon: '😈',
    check: (s) => s.lowRatingAny,
  },
  {
    id: 'santas_favourite',
    name: "Santa's Favourite",
    description: 'You found a film worthy of Santa himself.',
    hint: 'Give a movie a perfect 10★.',
    icon: '🎅',
    check: (s) => s.highRatingAny,
  },
  {
    id: 'the_critic',
    name: 'The Critic',
    description: 'You have opinions on a lot of movies.',
    hint: 'Rate 20 movies.',
    icon: '📝',
    check: (s) => s.totalRated >= 20,
  },
  {
    id: 'nice_list',
    name: 'Nice List',
    description: 'You are generous with your festive ratings.',
    hint: 'Keep your average rating above 5★.',
    icon: '✅',
    check: (s) => s.averageRating > 5,
  },
  {
    id: 'classic_connoisseur',
    name: 'Classic Connoisseur',
    description: 'You appreciate the classics before Y2K.',
    hint: 'Watch 5 movies released before 2000.',
    icon: '📼',
    check: (s) => s.classicWatched >= 5,
  },
  {
    id: 'animated_joy',
    name: 'Animated Joy',
    description: 'You love animated festive adventures.',
    hint: 'Watch 5 animated Christmas movies.',
    icon: '🧸',
    check: (s) => s.animatedCount >= 5,
  },
  {
    id: 'romcom_reindeer',
    name: 'Rom-Com Reindeer',
    description: 'You love a festive rom-com.',
    hint: 'Watch 5 Christmas romance movies.',
    icon: '💘',
    check: (s) => s.romanceCount >= 5,
  },
  {
    id: 'decorator',
    name: 'Decorator',
    description: 'You have a whole row of favourites lit up.',
    hint: 'Mark 10 movies as favourite.',
    icon: '🎀',
    check: (s) => s.favoriteCount >= 10,
  },
  {
    id: 'elf_mode',
    name: 'Elf Mode',
    description: 'You keep coming back like a dedicated Christmas elf.',
    hint: 'Use the app on 10 different days.',
    icon: '🧝‍♂️',
    check: (s) => s.usageDistinctDays >= 10,
  },
  {
    id: 'christmas_eve_watcher',
    name: 'Christmas Eve Watcher',
    description: 'You watched a movie on Christmas Eve.',
    hint: 'Watch a movie on Dec 24.',
    icon: '🕯️',
    check: (s) => s.hasChristmasEveWatch,
  },
  {
    id: 'new_years_cozy',
    name: "New Year's Cozy",
    description: 'You started the year with a cozy movie.',
    hint: 'Watch a movie on Jan 1.',
    icon: '🎆',
    check: (s) => s.hasNewYearsWatch,
  },
];

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
  const decemberDays = new Set<string>();
  const usageDays = new Set<string>();
  const watchedDays = new Set<string>();

  for (const um of userMovies) {
    if (um.watched) {
      totalWatched++;

      const watchedDate = toDateLike((um as any).watchedDate);
      if (watchedDate) {
        const key = watchedDate.toISOString().split('T')[0];
        watchedDays.add(key);
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
      }
      if (movie && movie.genres && movie.genres.includes('Romance')) {
        romanceCount++;
      }
      if (movie && movie.genres && movie.genres.includes('Animation')) {
        animatedCount++;
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
  for (const d of watchedDays) {
    const date = new Date(d + 'T00:00:00Z');
    const month = date.getMonth();
    const day = date.getDate();
    if (month === 11 && day === 24) {
      hasChristmasEveWatch = true;
    }
    if (month === 0 && day === 1) {
      hasNewYearsWatch = true;
    }
  }

  const averageRating = totalRated > 0 ? ratingSum / totalRated : 0;

  return {
    totalWatched,
    totalRated,
    averageRating,
    lowRatingAny,
    highRatingAny,
    classicWatched,
    romanceCount,
    animatedCount,
    favoriteCount,
    usageDistinctDays: usageDays.size,
    decemberDistinctDays: decemberDays.size,
    hasChristmasEveWatch,
    hasNewYearsWatch,
    hasTwelveDayStreak,
  };
}

export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  const userMoviesSnap = await getDocs(collection(db, `users/${userId}/movies`));
  const userMovies: UserMovie[] = [];
  const movieIds = new Set<string>();

  userMoviesSnap.forEach((d) => {
    const data = d.data() as any;
    userMovies.push({ id: d.id, ...data } as UserMovie);
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
