import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie, UserMovie } from '../types/movie';

import { updateMovieInCache, clearMovieCache } from './cacheUtils';

// Create or update a user movie in the subcollection
export const saveUserMovie = async (
  userId: string,
  movieId: string,
  movieData: Partial<UserMovie>
): Promise<UserMovie> => {
  // Reference to the user's movies subcollection
  const userMovieRef = doc(db, `users/${userId}/movies`, movieId);
  
  // Check if the user movie already exists
  const userMovieDoc = await getDoc(userMovieRef);
  
  if (userMovieDoc.exists()) {
    const existing = userMovieDoc.data() as any;

    // Update existing record
    const updatedData: any = {
      ...movieData,
      updatedAt: new Date()
    };

    // Maintain a rewatch counter so achievements like "Comfort Rewatch"
    // can detect multiple watches of the same movie.
    let nextRewatchCount = typeof existing.rewatchCount === 'number' ? existing.rewatchCount : 0;

    const incomingWatched = movieData.watched ?? existing.watched;
    const prevWatched = !!existing.watched;

    // Helper to normalise dates to YYYY-MM-DD for comparison
    const toDateKey = (value: any): string | null => {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString().split('T')[0];
      if (typeof value.toDate === 'function') {
        const d = value.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
      }
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    const prevDateKey = toDateKey(existing.watchedDate);
    const incomingDate = movieData.watchedDate ?? existing.watchedDate;
    const nextDateKey = toDateKey(incomingDate);

    // Count a new watch when:
    // - transitioning from not-watched to watched, or
    // - still watched but the stored watched date changes to a new day.
    if (incomingWatched) {
      if (!prevWatched) {
        nextRewatchCount += 1;
      } else if (prevDateKey && nextDateKey && prevDateKey !== nextDateKey) {
        nextRewatchCount += 1;
      }
    }

    if (nextRewatchCount > 0) {
      updatedData.rewatchCount = nextRewatchCount;
    }
    
    // Handle explicit null values for fields that should be removed
    // This ensures fields like rating are properly cleared when set to null
    if (movieData.rating === null) {
      // For Firestore, we need to use FieldValue.delete() to remove a field
      // But since we're using updateDoc, we can just include the null value
      updatedData.rating = null;
    }
    
    if (movieData.watchedDate === null) {
      updatedData.watchedDate = null;
    }
    
    if (movieData.review === null) {
      updatedData.review = null;
    }
    
    await updateDoc(userMovieRef, updatedData);
  } else {
    // Create new record
    const newData = {
      userId,
      movieId,
      watched: movieData.watched || false,
      favorite: movieData.favorite || false,
      addedAt: new Date(),
      updatedAt: new Date(),
      ...movieData
    };
    await setDoc(userMovieRef, newData);
  }
  
  // Get the updated document
  const updatedDoc = await getDoc(userMovieRef);
  const updatedUserMovie = { id: updatedDoc.id, ...updatedDoc.data() } as UserMovie;
  
  // Update the cache with the new data
  updateMovieInCache(userId, movieId, updatedUserMovie);
  
  return updatedUserMovie;
};

// Get a single user movie
export const getUserMovie = async (
  userId: string,
  movieId: string
): Promise<UserMovie | null> => {
  const userMovieRef = doc(db, `users/${userId}/movies`, movieId);
  const userMovieDoc = await getDoc(userMovieRef);
  
  if (userMovieDoc.exists()) {
    return { id: userMovieDoc.id, ...userMovieDoc.data() } as UserMovie;
  }
  
  return null;
};

// Get all user movies
export const getUserMovies = async (userId: string): Promise<UserMovie[]> => {
  const userMoviesRef = collection(db, `users/${userId}/movies`);
  const userMoviesSnapshot = await getDocs(userMoviesRef);
  
  const userMovies: UserMovie[] = [];
  userMoviesSnapshot.forEach((doc) => {
    userMovies.push({ id: doc.id, ...doc.data() } as UserMovie);
  });
  
  return userMovies;
};

// Get user movies with filters
export const getUserMoviesWithFilter = async (
  userId: string,
  filterField: string,
  filterValue: any
): Promise<UserMovie[]> => {
  const userMoviesRef = collection(db, `users/${userId}/movies`);
  const q = query(userMoviesRef, where(filterField, '==', filterValue));
  const userMoviesSnapshot = await getDocs(q);
  
  const userMovies: UserMovie[] = [];
  userMoviesSnapshot.forEach((doc) => {
    userMovies.push({ id: doc.id, ...doc.data() } as UserMovie);
  });
  
  return userMovies;
};

// Delete a user movie
export const deleteUserMovie = async (userId: string, movieId: string): Promise<void> => {
  const userMovieRef = doc(db, `users/${userId}/movies`, movieId);
  await deleteDoc(userMovieRef);
  
  // Clear the cache when a movie is deleted
  clearMovieCache();
};

import { getMovieCache, setMovieCache } from './cacheUtils';

// Get user movies with their movie details
export const getUserMoviesWithDetails = async (userId: string): Promise<{
  userMovies: {[movieId: string]: UserMovie},
  movies: Movie[]
}> => {
  // Check cache first
  const cachedData = getMovieCache(userId);
  if (cachedData) {
    return cachedData;
  }
  
  // If not in cache, fetch from Firestore
  // Get all user movies
  const userMovies = await getUserMovies(userId);
  
  // Create a map of movie IDs to user movies
  const userMoviesMap: {[movieId: string]: UserMovie} = {};
  const movieIds: string[] = [];
  
  userMovies.forEach((userMovie) => {
    userMoviesMap[userMovie.movieId] = userMovie;
    movieIds.push(userMovie.movieId);
  });
  
  // Fetch movie details
  const moviesData: Movie[] = [];
  
  // If user has movies, fetch their details in batches
  if (movieIds.length > 0) {
    // Process in batches of 10 to avoid too many parallel requests
    const batchSize = 10;
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      const promises = batch.map(movieId => 
        getDoc(doc(db, 'movies', movieId))
          .then(movieDoc => {
            if (movieDoc.exists()) {
              return { id: movieDoc.id, ...movieDoc.data() } as Movie;
            }
            return null;
          })
          .catch(error => {
            console.error(`Error fetching movie ${movieId}:`, error);
            return null;
          })
      );
      
      const results = await Promise.all(promises);
      moviesData.push(...results.filter(Boolean) as Movie[]);
    }
  }
  
  // Store in cache
  const result = {
    userMovies: userMoviesMap,
    movies: moviesData
  };
  setMovieCache(userId, userMoviesMap, moviesData);
  
  return result;
};

// Reset all watched flags for a user's movies while preserving ratings, reviews, and favourites
export const resetUserWatchedStatus = async (userId: string): Promise<void> => {
  const userMoviesRef = collection(db, `users/${userId}/movies`);
  const snapshot = await getDocs(userMoviesRef);

  const batchSize = 20;
  let batchOps: Promise<any>[] = [];

  snapshot.forEach((d) => {
    const ref = doc(db, `users/${userId}/movies`, d.id);
    const data = d.data() as any;

    // Preserve the previous watched date so that achievements like
    // "Tradition Keeper" can detect watches across different years
    const previousWatchedDate = data.watchedDate || data.lastWatchedDate || null;

    const updatePayload: any = {
      watched: false,
      watchedDate: null,
    };

    if (previousWatchedDate) {
      updatePayload.lastWatchedDate = previousWatchedDate;
    }

    batchOps.push(updateDoc(ref, updatePayload));
  });

  if (batchOps.length >= batchSize) {
    // flush current batch before starting a new one
    // eslint-disable-next-line no-floating-promises
    batchOps = [Promise.all(batchOps)];
  }

  if (batchOps.length) {
    await Promise.all(batchOps);
  }

  clearMovieCache();
};

// Clear all achievement documents for a user so they can be re-earned
export const resetUserAchievements = async (userId: string): Promise<void> => {
  const achievementsRef = collection(db, `users/${userId}/achievements`);
  const snapshot = await getDocs(achievementsRef);

  const deletes: Promise<any>[] = [];
  snapshot.forEach((d) => {
    deletes.push(deleteDoc(doc(db, `users/${userId}/achievements`, d.id)));
  });

  if (deletes.length) {
    await Promise.all(deletes);
  }

  // Record an achievements reset timestamp on the main user doc so that old
  // activity doesn't immediately re-unlock badges when stats are recalculated.
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { achievementsResetAfter: new Date() });
};
