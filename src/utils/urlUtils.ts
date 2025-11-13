// Utility functions for handling URL slugs

/**
 * Converts a movie title to a URL-friendly slug
 * @param title The movie title to convert
 * @returns A URL-friendly slug
 */
export const createSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim(); // Remove leading/trailing spaces
};

/**
 * Creates a URL for a movie using its title and ID
 * @param title The movie title
 * @param id The movie ID
 * @returns A URL with the title as a slug and the ID as a query parameter
 */
export const createMovieUrl = (title: string, id: string): string => {
  const slug = createSlugFromTitle(title);
  return `/movies/${slug}?id=${id}`;
};

/**
 * Extracts the movie ID from the URL query parameters
 * @param search The URL search string (e.g. "?id=123")
 * @returns The movie ID or null if not found
 */
export const getMovieIdFromUrl = (search: string): string | null => {
  const params = new URLSearchParams(search);
  return params.get('id');
};
