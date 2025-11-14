// src/components/imports/LocalSearchPanel.tsx
import React, { useState } from 'react';
import { searchLocalMovies } from '../../services/searchService';
import { TMDBMovie } from '../../types/movie';
import { posterSrc } from '../../utils/matching';

type LocalMovieLike = TMDBMovie & {
  source?: 'local';
  firestoreId?: string;
};

type Props = {
  onSelect: (movieLike: LocalMovieLike) => void;
};

const LocalSearchPanel: React.FC<Props> = ({ onSelect }) => {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmedQ = q.trim();
    if (!trimmedQ) {
      setError('Please enter a search term');
      return;
    }
    if (trimmedQ.length < 2) {
      setError('Search term must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults([]);

      const local = await searchLocalMovies(trimmedQ);

      const mapped = local
        .filter((m: any) => m.tmdbId)
        .map((m: any) => ({
          id: m.tmdbId,
          title: m.title,
          release_date: m.releaseDate,
          poster_path: m.posterUrl?.startsWith('https://image.tmdb.org/t/p/')
            ? m.posterUrl.replace('https://image.tmdb.org/t/p/w500', '')
            : null,
          source: 'local' as const,
          firestoreId: m.id,          // <— keep a reference to the catalogue doc
        })) as LocalMovieLike[];

      setResults(mapped);

      if (mapped.length === 0) {
        setError(`No movies found matching "${trimmedQ}". Try a different search term.`);
      }
    } catch (e: any) {
      console.error('Search error:', e);
      setError(e?.message ?? 'Local search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input 
          className="input input-bordered flex-1" 
          value={q} 
          onChange={e=>setQ(e.target.value)} 
          placeholder="Search local catalogue..." 
          onKeyDown={e=>e.key==='Enter'&&handleSearch()}
          disabled={loading}
        />
        <button 
          className="btn btn-primary" 
          onClick={handleSearch} 
          disabled={loading || !q.trim() || q.trim().length < 2}
        >
          {loading ? <span className="loading loading-spinner loading-sm"/> : 'Search'}
        </button>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      {loading && (
        <div className="flex justify-center p-4">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
      
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {results.map(m=>(
            <div key={m.id} className="card bg-base-100 shadow cursor-pointer hover:shadow-lg transition-shadow" onClick={()=>onSelect(m)}>
              <figure>
                {posterSrc(m) ? 
                  <img src={posterSrc(m)} alt={m.title} className="w-full h-64 object-contain"/> : 
                  <div className="h-64 w-full flex items-center justify-center bg-base-200">
                    <i className="fas fa-film text-3xl opacity-50"/>
                  </div>
                }
              </figure>
              <div className="card-body p-3">
                <div className="font-semibold">{m.title}</div>
                <div className="text-xs opacity-70">{m.release_date?.slice(0,4)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocalSearchPanel;
