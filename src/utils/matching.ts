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

  if (excelMovie.releaseDate != null && omdbMovie.Year) {
    const aStr = String(excelMovie.releaseDate).slice(0, 4);
    const bStr = String(omdbMovie.Year).slice(0, 4);
    const aNum = parseInt(aStr, 10);
    const bNum = parseInt(bStr, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum === bNum) confidence += 40;
      else if (Math.abs(aNum - bNum) <= 1) confidence += 20;
    }
  }

  return Math.min(Math.round(confidence), 100);
}

export const posterSrc = (m: any) =>
  m?.Poster && m.Poster !== 'N/A'
    ? m.Poster
    : m?.posterUrl || '';
