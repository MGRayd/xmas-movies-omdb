import { Movie, UserMovie } from '../types/movie';

/**
 * Converts user movie data to CSV format for export
 * @param movies Array of movie objects
 * @param userMovies Map of movie IDs to user movie data
 * @returns CSV string with headers
 */
export const exportMoviesToCSV = (
  movies: Movie[],
  userMovies: {[movieId: string]: UserMovie}
): string => {
  // Define CSV headers
  const headers = [
    'Title',
    'TMDB ID',
    'Release Year',
    'Watched',
    'Watched Date',
    'Rating',
    'Review',
    'Favorite',
    'Date Added'
  ].join(',');
  
  // Map movies to CSV rows
  const rows = movies.map(movie => {
    const userMovie = userMovies[movie.id];
    if (!userMovie) return null;
    
    // Format dates
    const releaseYear = movie.releaseDate ? movie.releaseDate.substring(0, 4) : '';
    const watchedDate = userMovie.watchedDate ? formatDate(userMovie.watchedDate) : '';
    const addedDate = userMovie.addedAt ? formatDate(userMovie.addedAt) : '';
    
    // Escape fields that might contain commas
    const escapedTitle = escapeCSVField(movie.title);
    const escapedReview = userMovie.review ? escapeCSVField(userMovie.review) : '';
    
    return [
      escapedTitle,
      movie.tmdbId || '',
      releaseYear,
      userMovie.watched ? 'Yes' : 'No',
      watchedDate,
      userMovie.rating !== null && userMovie.rating !== undefined ? userMovie.rating : '',
      escapedReview,
      userMovie.favorite ? 'Yes' : 'No',
      addedDate
    ].join(',');
  }).filter(Boolean); // Remove null entries
  
  // Combine headers and rows
  return [headers, ...rows].join('\n');
};

/**
 * Format a date object to YYYY-MM-DD format
 */
const formatDate = (date: Date | any): string => {
  if (!(date instanceof Date)) {
    // Handle Firestore timestamps
    try {
      // Check if it's a Firestore timestamp (has toDate method)
      if (date && typeof date.toDate === 'function') {
        date = date.toDate();
      } else {
        date = new Date(date);
      }
    } catch (e) {
      return '';
    }
  }
  
  return date.toISOString().split('T')[0];
};

/**
 * Escape a field for CSV format
 * Wraps fields with commas in double quotes and escapes existing quotes
 */
const escapeCSVField = (field: string): string => {
  if (!field) return '';
  
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Replace double quotes with two double quotes
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
};

/**
 * Triggers a file download in the browser
 * @param content Content to download
 * @param fileName Name of the file
 * @param contentType MIME type of the file
 */
export const downloadFile = (
  content: string,
  fileName: string,
  contentType: string
): void => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

/**
 * Export user movies to a CSV file and trigger download
 */
export const exportUserMoviesToCSV = async (
  movies: Movie[],
  userMovies: {[movieId: string]: UserMovie},
  userName: string
): Promise<void> => {
  const csvContent = exportMoviesToCSV(movies, userMovies);
  const fileName = `${userName.replace(/\s+/g, '_')}_christmas_movies_${formatDate(new Date())}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
};
