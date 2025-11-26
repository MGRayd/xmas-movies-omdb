// src/services/searchService.ts
import { db } from '../firebase';
import {
  collection, getDocs, query as q,
  where, orderBy, startAt, endAt, limit
} from 'firebase/firestore';
import { normalizeTitle } from './omdbService';

export async function searchLocalMovies(needleRaw: string, take = 24) {
  // Don't normalize the raw search term yet - we'll use both forms
  const needle = needleRaw.toLowerCase().trim();
  const normalizedNeedle = normalizeTitle(needleRaw);
  const moviesCol = collection(db, 'movies');
  const results = new Map();

  // Try prefix search on sortTitleLower (normalized title)
  if (normalizedNeedle) {
    const prefixSnap = await getDocs(
      q(moviesCol, orderBy('sortTitleLower'), startAt(normalizedNeedle), endAt(normalizedNeedle + '\uf8ff'), limit(take))
    );
    prefixSnap.docs.forEach(d => {
      const data = { id: d.id, ...d.data() };
      results.set(d.id, data);
    });
  }

  // Always search by keywords for more comprehensive results
  const terms = needle.split(' ').filter(Boolean).slice(0, 10);
  if (terms.length) {
    const kwSnap = await getDocs(q(moviesCol, where('keywords', 'array-contains-any', terms), limit(take)));
    kwSnap.docs.forEach(d => {
      if (!results.has(d.id)) {
        results.set(d.id, { id: d.id, ...d.data() });
      }
    });
  }

  // If we still don't have enough results, try a broader title search
  if (results.size < Math.min(10, take) && needle.length >= 2) {
    // Get all movies and filter client-side for more flexible matching
    const allMoviesSnap = await getDocs(q(moviesCol, limit(100)));
    allMoviesSnap.docs.forEach(d => {
      if (!results.has(d.id)) {
        const data = d.data();
        const title = (data.title || '').toLowerCase();
        const originalTitle = (data.originalTitle || '').toLowerCase();
        
        // Check if the title or original title contains our search term
        if (title.includes(needle) || originalTitle.includes(needle)) {
          results.set(d.id, { id: d.id, ...data });
        }
      }
    });
  }

  return Array.from(results.values());
}
