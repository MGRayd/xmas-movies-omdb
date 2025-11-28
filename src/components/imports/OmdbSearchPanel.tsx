// src/components/imports/OmdbSearchPanel.tsx
import React, { useState } from 'react';
import { searchMoviesOmdb, getMovieDetailsOmdb } from '../../services/omdbService';
import { OmdbMovie } from '../../types/movie';
import { posterSrc } from '../../utils/matching';

type Props = {
  omdbApiKey: string; // OMDb key
  onSelect: (movie: OmdbMovie) => void;
};

const OmdbSearchPanel: React.FC<Props> = ({ omdbApiKey, onSelect }) => {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OmdbMovie[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const raw = q.trim();
    if (!raw) return;

    // Detect IMDb id: tt1234567 or just 1234567
    const imdbLike = raw.toLowerCase().startsWith('tt') ? raw : `tt${raw}`;
    const imdbMatch = /^tt\d+$/.test(imdbLike) ? imdbLike : null;

    try {
      setLoading(true);
      setError(null);

      if (imdbMatch) {
        // Direct lookup by IMDb id
        const details = await getMovieDetailsOmdb(imdbMatch, omdbApiKey);
        setResults([details]);
      } else {
        // Fallback to title search
        const res = await searchMoviesOmdb(raw, omdbApiKey);
        setResults(res);
      }
    } catch (e: any) {
      setResults([]);
      setError(e?.message ?? 'OMDb search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input input-bordered flex-1" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search OMDb by title or IMDb id..." onKeyDown={e=>e.key==='Enter'&&handleSearch()}/>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !omdbApiKey}>{loading ? <span className="loading loading-spinner loading-sm"/> : 'Search'}</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {results.length>0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {results.map(m=>(
            <div key={m.imdbID} className="card bg-base-100 shadow cursor-pointer hover:shadow-lg transition-shadow" onClick={()=>onSelect(m)}>
              <figure>
                {posterSrc(m) ? 
                  <img src={posterSrc(m)} alt={m.Title} className="w-full h-64 object-contain"/> : 
                  <div className="h-64 w-full flex items-center justify-center bg-base-200">
                    <i className="fas fa-film text-3xl opacity-50"/>
                  </div>
                }
              </figure>
              <div className="card-body p-3">
                <div className="font-semibold">{m.Title}</div>
                <div className="text-xs opacity-70">{m.Year}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OmdbSearchPanel;
