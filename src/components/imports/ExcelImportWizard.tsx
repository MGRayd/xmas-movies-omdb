// src/components/imports/ExcelImportWizard.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ExcelMovieImport, OmdbMovie } from '../../types/movie';
import { calculateConfidence, posterSrc } from '../../utils/matching';
import { searchMoviesOmdb, getMovieDetailsOmdb, formatOmdbMovie } from '../../services/omdbService';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { saveUserMovie, getUserMovie } from '../../utils/userMovieUtils';

type Match = {
  excelData: ExcelMovieImport;
  tmdbMatch: OmdbMovie | null;
  confidence: number;
  status: 'matched' | 'unmatched' | 'duplicate' | 'manual';
  userMovieExists: boolean;
  movieId?: string;
  selected: boolean;
};

type Props = {
  omdbApiKey: string; // OMDb key
  userId: string;
  onDone?: () => void;
};

const ExcelImportWizard: React.FC<Props> = ({ omdbApiKey, userId, onDone }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ExcelMovieImport[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [step, setStep] = useState<'upload'|'review'|'import'>('upload');
  const [scanPct, setScanPct] = useState(0);
  const [scanLabel, setScanLabel] = useState<string | null>(null);
  const [importPct, setImportPct] = useState(0);
  const [loading, setLoading] = useState(false);
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const [manualResults, setManualResults] = useState<OmdbMovie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = matches.filter(m=>m.selected && m.tmdbMatch).length;

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = evt => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet);
      const movies: ExcelMovieImport[] = json.map(r => ({
        // Required title column (case-insensitive variants supported)
        title: r.title || r.Title || r.name || r.Name || '',
        // Optional IMDb id column
        imdbId: r.imdb || r.IMDB || r.Imdb || r.imdbId || r.imdbID || '',
        // Optional year/release column; year will still be passed into OMDb search when no imdbId is present
        releaseDate: r.year || r.Year || r.releaseDate || r.ReleaseDate || r.release_date || '',
        watched: r.watched || r.Watched || false,
        rating: r.rating || r.Rating || null,
        review: r.review || r.Review || r.notes || r.Notes || '',
      })).filter(m => m.title);
      setRows(movies);
    };
    reader.readAsBinaryString(f);
  };

  const scan = async () => {
    if (!rows.length || !omdbApiKey) { setError('Missing data or OMDb key'); return; }
    try {
      setLoading(true); setError(null); setMatches([]); setScanPct(0); setScanLabel(null);
      const out: Match[] = [];
      const moviesRef = collection(db, 'movies');

      for (let i=0;i<rows.length;i++){
        const r = rows[i];
        setScanLabel(r.title || null);
        try{
          // If an explicit IMDb id is provided, use it directly.
          let details: OmdbMovie | null = null;
          if (r.imdbId) {
            details = await getMovieDetailsOmdb(r.imdbId, omdbApiKey);
          } else {
            // Prefer title + year/release when present, but fall back to title-only
            // if OMDb returns no results (or an error) for the combined query.
            const combined = `${r.title} ${r.releaseDate || ''}`.trim();
            let searchTerm = combined || r.title;
            let res: OmdbMovie[] = [];

            try {
              res = await searchMoviesOmdb(searchTerm, omdbApiKey);
            } catch {
              res = [];
            }

            // If we searched with title+year and got nothing, retry with title only.
            if (!res.length && combined && r.title && combined !== r.title) {
              searchTerm = r.title;
              try {
                res = await searchMoviesOmdb(searchTerm, omdbApiKey);
              } catch {
                res = [];
              }
            }

            if (!res.length) {
              out.push({ excelData:r, tmdbMatch:null, confidence:0, status:'unmatched', userMovieExists:false, selected:false });
              continue;
            }

            details = await getMovieDetailsOmdb(res[0].imdbID, omdbApiKey);
          }

          if (!details) {
            out.push({ excelData:r, tmdbMatch:null, confidence:0, status:'unmatched', userMovieExists:false, selected:false });
          } else {
            const conf = calculateConfidence(r, details);

            const existSnap = await getDocs(query(moviesRef, where('imdbId','==', details.imdbID)));
            let movieId: string | undefined;
            let userMovieExists = false;
            if (!existSnap.empty) {
              movieId = existSnap.docs[0].id;
              const um = await getUserMovie(userId, movieId);
              userMovieExists = !!um;
            }

            out.push({
              excelData:r,
              tmdbMatch:details,
              confidence:conf,
              status: userMovieExists ? 'duplicate' : conf >= 70 ? 'matched' : 'manual',
              userMovieExists,
              movieId,
              selected: !userMovieExists
            });
          }
        } catch {
          out.push({ excelData:r, tmdbMatch:null, confidence:0, status:'unmatched', userMovieExists:false, selected:false });
        }
        setScanPct(Math.round(((i+1)/rows.length)*100));
      }
      setMatches(out);
      setStep('review');
    } finally {
      setLoading(false);
      setScanLabel(null);
    }
  };

  const manualSearch = async (idx: number, text?: string) => {
  try {
    setLoading(true);
    const current = matches[idx];
    const term = text || current.excelData.title;
    const res = await searchMoviesOmdb(term, omdbApiKey);
    setManualIndex(idx);
    setManualResults(res);
  } finally {
    setLoading(false);
  }
};

  const selectManual = async (tmdb: OmdbMovie) => {
  if (manualIndex == null) return;
  setLoading(true);
  try {
    const details = await getMovieDetailsOmdb(tmdb.imdbID, omdbApiKey);
    const conf = calculateConfidence(matches[manualIndex].excelData, details);

    const moviesRef = collection(db, 'movies');
    const existSnap = await getDocs(query(moviesRef, where('imdbId','==', details.imdbID)));
    let movieId: string | undefined;
    let userMovieExists = false;
    if (!existSnap.empty) {
      movieId = existSnap.docs[0].id;
      const um = await getUserMovie(userId, movieId);
      userMovieExists = !!um;
    }

    setMatches(prev => {
      const copy = [...prev];
      const m = copy[manualIndex];
      copy[manualIndex] = {
        ...m,
        tmdbMatch: details,
        confidence: conf,
        status: userMovieExists ? 'duplicate' : 'matched',
        userMovieExists,
        movieId,
        selected: !userMovieExists,
      };
      return copy;
    });

    setManualIndex(null);
    setManualResults([]);
  } finally {
    setLoading(false);
  }
};

  const doImport = async () => {
    const toImport = matches.filter(m=>m.selected && m.tmdbMatch);
    if (!toImport.length) return;
    setStep('import');
    setImportPct(0);
    const moviesRef = collection(db, 'movies');

    for (let i=0;i<toImport.length;i++) {
      const m = toImport[i];
      try {
        let movieId = m.movieId;
        if (!movieId) {
          const newRef = await addDoc(moviesRef, { ...formatOmdbMovie(m.tmdbMatch!), addedAt:new Date(), updatedAt:new Date() });
          movieId = newRef.id;
        }
        await saveUserMovie(userId, movieId, {
          userId, movieId, watched: m.excelData.watched || false, rating: m.excelData.rating || null, review: m.excelData.review || '', favorite: false,
        });
      } catch {}
      setImportPct(Math.round(((i+1)/toImport.length)*100));
    }
    onDone?.();
  };

  return (
    <div className="space-y-6">
      {step==='upload' && (
        <div className="space-y-4">
          <input type="file" accept=".xlsx,.xls" className="file-input file-input-bordered w-full" onChange={onUpload}/>
          {!!rows.length && <div className="text-sm opacity-80">{rows.length} rows detected</div>}
          <button className="btn btn-primary" onClick={scan} disabled={!omdbApiKey || !rows.length || loading}>
            {loading ? <span className="loading loading-spinner loading-sm"/> : 'Scan & Match'}
          </button>
          {loading && !!scanPct && scanPct < 100 && (
            <div className="space-y-1">
              <div className="text-sm">Scanning {scanPct}%</div>
              <progress className="progress w-full" value={scanPct} max={100} />
              {scanLabel && (
                <div className="text-xs opacity-70 truncate">Current: {scanLabel}</div>
              )}
            </div>
          )}
        </div>
      )}

      {step==='review' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-bold">Review Matches</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setStep('upload')}>Back</button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead><tr><th></th><th>Excel</th><th>Match</th><th>Confidence</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {matches.map((m,idx)=>(
                  <tr key={idx} className={m.userMovieExists ? 'bg-warning bg-opacity-20' : ''}>
                    <td><input type="checkbox" className="checkbox" checked={m.selected} disabled={!m.tmdbMatch} onChange={()=>{
                      const copy=[...matches]; copy[idx].selected=!copy[idx].selected; setMatches(copy);
                    }}/></td>
                    <td>
                      <div className="font-semibold">{m.excelData.title}</div>
                      <div className="text-xs opacity-70">{m.excelData.releaseDate || '-'}</div>
                    </td>
                    <td>
                      {m.tmdbMatch ? (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-18">
                            {posterSrc(m.tmdbMatch) ? <img src={posterSrc(m.tmdbMatch)} className="object-cover"/> : <div className="w-full h-full bg-base-200"/>}
                          </div>
                          <div>
                            <div className="font-semibold">{m.tmdbMatch.Title}</div>
                            <div className="text-xs opacity-70">{m.tmdbMatch.Year}</div>
                          </div>
                        </div>
                      ) : <span className="text-error">No match</span>}
                    </td>
                    <td>
                      {m.tmdbMatch ? (
                        <div className="flex items-center">
                          <progress className={`progress ${m.confidence>=70?'progress-success':m.confidence>=40?'progress-warning':'progress-error'}`} value={m.confidence} max={100}/>
                          <span className="ml-2">{m.confidence}%</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {m.status === 'matched' && <div className="badge badge-success">Matched</div>}
                      {m.status === 'unmatched' && <div className="badge badge-error">Unmatched</div>}
                      {m.status === 'duplicate' && <div className="badge badge-warning">Duplicate</div>}
                      {m.status === 'manual' && <div className="badge badge-info">Manual</div>}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => manualSearch(idx)}
                      >
                        <i className="fas fa-search" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={doImport} disabled={!selectedCount || loading}>
              Import {selectedCount} Movies
            </button>
          </div>

          {!!scanPct && scanPct<100 && (
            <div><progress className="progress w-full" value={scanPct} max={100}/></div>
          )}
        </div>
      )}

      {step==='import' && (
        <div className="space-y-3">
          <div className="font-bold">Importing…</div>
          <progress className="progress w-full" value={importPct} max={100}/>
        </div>
      )}

      {manualIndex !== null && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              Manual match: {matches[manualIndex].excelData.title}
            </h3>

            {/* search input */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Search for a movie..."
                defaultValue={matches[manualIndex].excelData.title}
                onKeyDown={(e) =>
                  e.key === 'Enter' && manualSearch(manualIndex, (e.target as HTMLInputElement).value)
                }
              />
              <button
                className="btn btn-primary w-full sm:w-auto"
                onClick={() =>
                  manualSearch(
                    manualIndex,
                    (document.querySelector('.modal input') as HTMLInputElement)?.value
                  )
                }
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : <i className="fas fa-search" />}
              </button>
            </div>

            {/* results grid remains the same */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {manualResults.map(m=>(
                <div key={m.imdbID} className="card bg-base-100 shadow cursor-pointer" onClick={()=>selectManual(m)}>
                  <figure>{posterSrc(m) ? <img src={posterSrc(m)}/> : <div className="h-48 w-full bg-base-200"/>}</figure>
                  <div className="card-body p-3">
                    <div className="text-sm font-semibold">{m.Title}</div>
                    <div className="text-xs opacity-70">{m.Year}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => { setManualIndex(null); setManualResults([]); }}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
};

export default ExcelImportWizard;
