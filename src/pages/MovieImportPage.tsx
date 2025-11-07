import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Movie, TMDBMovie, ExcelMovieImport } from '../types/movie';
import { searchMovies, getMovieDetails, formatTMDBMovie } from '../services/tmdbService';
import { saveUserMovie } from '../utils/userMovieUtils';
import * as XLSX from 'xlsx';

const MovieImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'tmdb' | 'excel'>('tmdb');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // TMDB Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  
  // Excel Import
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelMovieImport[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [totalImports, setTotalImports] = useState(0);
  
  // Load user's TMDB API key if available
  useEffect(() => {
    if (userProfile?.tmdbApiKey) {
      setTmdbApiKey(userProfile.tmdbApiKey);
    }
  }, [userProfile]);
  
  const handleSearch = async () => {
    if (!searchQuery.trim() || !tmdbApiKey) return;
    
    try {
      setLoading(true);
      setError(null);
      setSelectedMovie(null);
      
      const results = await searchMovies(searchQuery, tmdbApiKey);
      setSearchResults(results.results);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search movies');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectMovie = async (movie: TMDBMovie) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get full movie details including credits
      const movieDetails = await getMovieDetails(movie.id, tmdbApiKey);
      setSelectedMovie(movieDetails);
    } catch (err: any) {
      console.error('Error fetching movie details:', err);
      setError(err.message || 'Failed to fetch movie details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToCollection = async () => {
    if (!currentUser || !selectedMovie) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if movie already exists in database
      const moviesRef = collection(db, 'movies');
      const q = query(moviesRef, where('tmdbId', '==', selectedMovie.id));
      const querySnapshot = await getDocs(q);
      
      let movieId: string;
      
      if (querySnapshot.empty) {
        // Add movie to database
        const formattedMovie = {
          ...formatTMDBMovie(selectedMovie),
          addedAt: new Date(),
          updatedAt: new Date()
        };
        
        const newMovieRef = await addDoc(moviesRef, formattedMovie);
        movieId = newMovieRef.id;
      } else {
        // Movie already exists
        movieId = querySnapshot.docs[0].id;
      }
      
      // Add to user's collection using the new utility function
      await saveUserMovie(currentUser.uid, movieId, {
        userId: currentUser.uid,
        movieId,
        watched: false,
        favorite: false
      });
      
      setSuccess('Movie added to your collection!');
      setSelectedMovie(null);
      setSearchResults([]);
      setSearchQuery('');
      
      // Save TMDB API key to user profile if it's new
      if (tmdbApiKey && tmdbApiKey !== userProfile?.tmdbApiKey) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { tmdbApiKey }, { merge: true });
      }
      
      // Redirect to movie detail page
      setTimeout(() => {
        navigate(`/movies/${movieId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error adding movie:', err);
      setError(err.message || 'Failed to add movie to collection');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setExcelFile(file);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
        
        // Map to our format
        const movies: ExcelMovieImport[] = jsonData.map(row => ({
          title: row.title || row.Title || row.name || row.Name || '',
          releaseDate: row.releaseDate || row.ReleaseDate || row.release_date || row.year || row.Year || '',
          watched: row.watched || row.Watched || false,
          rating: row.rating || row.Rating || null,
          review: row.review || row.Review || row.notes || row.Notes || ''
        })).filter(movie => movie.title);
        
        setExcelData(movies);
        setTotalImports(movies.length);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        setError('Failed to parse Excel file. Please check the format.');
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read Excel file');
    };
    
    reader.readAsBinaryString(file);
  };
  
  const handleImportExcel = async () => {
    if (!currentUser || !excelData.length || !tmdbApiKey) {
      if (!tmdbApiKey) {
        setError('TMDB API key is required for Excel import to match movies');
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setImportProgress(0);
      
      const moviesRef = collection(db, 'movies');
      let imported = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const movieData of excelData) {
        try {
          // Search for the movie in TMDB
          const searchQuery = `${movieData.title} ${movieData.releaseDate || ''}`;
          const searchResults = await searchMovies(searchQuery.trim(), tmdbApiKey);
          
          if (searchResults.results.length === 0) {
            console.warn(`No TMDB match found for: ${movieData.title}`);
            skipped++;
            continue;
          }
          
          // Get the best match (first result)
          const bestMatch = searchResults.results[0];
          
          // Get full movie details
          const movieDetails = await getMovieDetails(bestMatch.id, tmdbApiKey);
          
          // Check if movie with this TMDB ID already exists
          const existingMovieQuery = query(moviesRef, where('tmdbId', '==', movieDetails.id));
          const existingMovieSnapshot = await getDocs(existingMovieQuery);
          
          let movieId: string;
          
          if (existingMovieSnapshot.empty) {
            // Create new movie record with TMDB data
            const formattedMovie = {
              ...formatTMDBMovie(movieDetails),
              addedAt: new Date(),
              updatedAt: new Date()
            };
            
            const newMovieRef = await addDoc(moviesRef, formattedMovie);
            movieId = newMovieRef.id;
          } else {
            // Use existing movie
            movieId = existingMovieSnapshot.docs[0].id;
          }
          
          // Add to user's collection using the new utility function
          await saveUserMovie(currentUser.uid, movieId, {
            userId: currentUser.uid,
            movieId,
            watched: movieData.watched || false,
            rating: movieData.rating || null,
            review: movieData.review || '',
            favorite: false
          });
          
          imported++;
        } catch (err) {
          console.error(`Error importing movie ${movieData.title}:`, err);
          errors++;
        }
        
        setImportProgress(Math.round(((imported + skipped + errors) / excelData.length) * 100));
      }
      
      const summary = `Import complete: ${imported} movies imported, ${skipped} skipped, ${errors} errors.`;
      setSuccess(summary);
      setExcelData([]);
      setExcelFile(null);
      
      // Redirect to movies page
      setTimeout(() => {
        navigate('/movies');
      }, 2000);
    } catch (err: any) {
      console.error('Error importing movies:', err);
      setError(err.message || 'Failed to import movies');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link to="/movies" className="btn btn-ghost">
          <i className="fas fa-arrow-left mr-2"></i> Back to Movies
        </Link>
        <Link to="/profile" className="btn btn-outline btn-primary">
          <i className="fas fa-user-cog mr-2"></i> Profile Settings
        </Link>
      </div>
      
      <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line mb-6">Import Movies</h1>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-6">
          <i className="fas fa-check-circle mr-2"></i>
          <span>{success}</span>
        </div>
      )}
      
      <div className="tabs tabs-boxed mb-6">
        <button 
          className={`tab ${activeTab === 'tmdb' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tmdb')}
        >
          <i className="fas fa-search mr-2"></i> Search TMDB
        </button>
        <button 
          className={`tab ${activeTab === 'excel' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('excel')}
        >
          <i className="fas fa-file-excel mr-2"></i> Import from Excel
        </button>
      </div>
      
      {activeTab === 'tmdb' && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!tmdbApiKey ? (
            <div className="alert alert-warning mb-6">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <div className="flex-1">
                <h3 className="font-bold">TMDB API Key Required</h3>
                <p className="text-sm">
                  You need to set your TMDB API key in your profile settings to search for movies.
                </p>
              </div>
              <Link to="/profile" className="btn btn-sm btn-primary">
                <i className="fas fa-user-cog mr-2"></i> Set API Key
              </Link>
            </div>
          ) : null}
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              className="input input-bordered flex-1" 
              placeholder="Search for a Christmas movie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading || !tmdbApiKey}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <i className="fas fa-search"></i>
              )}
            </button>
          </div>
          
          {searchResults.length > 0 && !selectedMovie && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Search Results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {searchResults.map((movie) => (
                  <div 
                    key={movie.id} 
                    className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
                    onClick={() => handleSelectMovie(movie)}
                  >
                    <figure className="h-48">
                      {movie.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                          alt={movie.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <i className="fas fa-film text-4xl text-gray-500"></i>
                        </div>
                      )}
                    </figure>
                    <div className="card-body p-4">
                      <h3 className="card-title text-lg">{movie.title}</h3>
                      <p className="text-sm text-gray-400">{movie.release_date?.substring(0, 4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedMovie && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Selected Movie</h2>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  {selectedMovie.poster_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} 
                      alt={selectedMovie.title} 
                      className="w-full rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-96 flex items-center justify-center bg-gray-800 rounded-lg">
                      <i className="fas fa-film text-6xl text-gray-500"></i>
                    </div>
                  )}
                </div>
                <div className="md:w-2/3">
                  <h3 className="text-2xl font-bold mb-2">{selectedMovie.title}</h3>
                  <p className="text-gray-400 mb-4">{selectedMovie.release_date?.substring(0, 4)}</p>
                  
                  {selectedMovie.genres && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedMovie.genres.map((genre) => (
                        <span key={genre.id} className="badge badge-outline">{genre.name}</span>
                      ))}
                    </div>
                  )}
                  
                  <p className="mb-6">{selectedMovie.overview}</p>
                  
                  <button 
                    className="btn btn-primary"
                    onClick={handleAddToCollection}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus mr-2"></i>
                        Add to Collection
                      </>
                    )}
                  </button>
                  <button 
                    className="btn btn-ghost ml-2"
                    onClick={() => setSelectedMovie(null)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'excel' && (
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg">
          {!tmdbApiKey ? (
            <div className="alert alert-warning mb-6">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <div className="flex-1">
                <h3 className="font-bold">TMDB API Key Required</h3>
                <p className="text-sm">
                  You need to set your TMDB API key in your profile settings to import movies from Excel.
                </p>
              </div>
              <Link to="/profile" className="btn btn-sm btn-primary">
                <i className="fas fa-user-cog mr-2"></i> Set API Key
              </Link>
            </div>
          ) : null}
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Import from Excel</h2>
            <p className="mb-4">
              Upload an Excel file with your Christmas movie list. The file should have columns for:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Title (required)</li>
              <li>Release Date/Year (optional)</li>
              <li>Watched (optional, true/false)</li>
              <li>Rating (optional, 1-10)</li>
              <li>Review/Notes (optional)</li>
            </ul>
          </div>
          
          <div className="mb-6">
            <input 
              type="file" 
              className="file-input file-input-bordered w-full" 
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={loading}
            />
          </div>
          
          {excelData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Preview ({excelData.length} movies found)</h3>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Year</th>
                      <th>Watched</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(0, 10).map((movie, index) => (
                      <tr key={index}>
                        <td>{movie.title}</td>
                        <td>{movie.releaseDate}</td>
                        <td>{movie.watched ? 'Yes' : 'No'}</td>
                        <td>{movie.rating || '-'}</td>
                      </tr>
                    ))}
                    {excelData.length > 10 && (
                      <tr>
                        <td colSpan={4} className="text-center">
                          ...and {excelData.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {importProgress > 0 && (
                <div className="mt-4">
                  <progress 
                    className="progress progress-primary w-full" 
                    value={importProgress} 
                    max="100"
                  ></progress>
                  <p className="text-center mt-2">{importProgress}% complete</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button 
                  className="btn btn-primary"
                  onClick={handleImportExcel}
                  disabled={loading || !tmdbApiKey}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-import mr-2"></i>
                      Import {excelData.length} Movies
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MovieImportPage;
