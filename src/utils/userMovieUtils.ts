import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Movie, UserMovie } from '../types/movie';

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
    // Update existing record
    const updatedData = {
      ...movieData,
      updatedAt: new Date()
    };
    
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
  return { id: updatedDoc.id, ...updatedDoc.data() } as UserMovie;
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
};

// Get user movies with their movie details
export const getUserMoviesWithDetails = async (userId: string): Promise<{
  userMovies: {[movieId: string]: UserMovie},
  movies: Movie[]
}> => {
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
  
  // If user has movies, fetch their details
  if (movieIds.length > 0) {
    // Fetch each movie by its document ID
    for (const movieId of movieIds) {
      try {
        const movieDoc = await getDoc(doc(db, 'movies', movieId));
        if (movieDoc.exists()) {
          moviesData.push({ id: movieDoc.id, ...movieDoc.data() } as Movie);
        }
      } catch (error) {
        console.error(`Error fetching movie ${movieId}:`, error);
      }
    }
  }
  
  return {
    userMovies: userMoviesMap,
    movies: moviesData
  };
};
