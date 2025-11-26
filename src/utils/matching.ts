// src/utils/matching.ts
import { OmdbMovie, ExcelMovieImport } from '../types/movie';

export function calculateConfidence(excelMovie: ExcelMovieImport, omdbMovie: OmdbMovie): number {
  let confidence = 0;
  const excelTitle = (excelMovie.title || '').toLowerCase();
  const omdbTitle = (omdbMovie.Title || '').toLowerCase();

  if (excelTitle && omdbTitle) {
    if (excelTitle === omdbTitle) confidence += 60;
    else if (omdbTitle.includes(excelTitle) || excelTitle.includes(omdbTitle)) confidence += 40;
    else {
      const ew = excelTitle.split(' ');
      const tw = omdbTitle.split(' ');
      const matching = ew.filter(w => tw.includes(w));
      confidence += (matching.length / Math.max(ew.length, tw.length)) * 40;
    }
  }

  if (excelMovie.releaseDate && omdbMovie.Year) {
    const a = excelMovie.releaseDate.slice(0, 4);
    const b = omdbMovie.Year.slice(0, 4);
    if (a === b) confidence += 40;
    else if (Math.abs(parseInt(a) - parseInt(b)) <= 1) confidence += 20;
  }

  return Math.min(Math.round(confidence), 100);
}

export const posterSrc = (m: any) =>
  m?.Poster && m.Poster !== 'N/A'
    ? m.Poster
    : m?.posterUrl || '';
