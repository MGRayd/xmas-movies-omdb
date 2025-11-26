// src/utils/catalogueImportUtils.ts
import { addDoc, collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getMovieDetailsOmdb, formatOmdbMovie } from '../services/omdbService';

/** Upsert a single movie into the catalogue (Firestore 'movies'), by IMDb id. */
export async function upsertMovieByImdbId(
  imdbId: string,
  omdbApiKey: string
): Promise<{ movieId: string; action: 'created' | 'updated' }> {
  const details = await getMovieDetailsOmdb(imdbId, omdbApiKey);

  const moviesRef = collection(db, 'movies');
  const q = query(moviesRef, where('imdbId', '==', details.imdbID));
  const snap = await getDocs(q);

  const payload = {
    ...formatOmdbMovie(details),
    updatedAt: new Date(),
  };

  if (snap.empty) {
    const withTimestamps = { ...payload, addedAt: new Date() };
    const newRef = await addDoc(moviesRef, withTimestamps);
    return { movieId: newRef.id, action: 'created' };
  } else {
    const docId = snap.docs[0].id;
    await setDoc(doc(db, 'movies', docId), payload, { merge: true });
    return { movieId: docId, action: 'updated' };
  }
}

/** Optional helper to avoid hammering the API. */
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/** Upsert many movies by IMDb ids, with optional delay between calls. */
export async function upsertMoviesByImdbIds(
  imdbIds: string[],
  omdbApiKey: string,
  onProgress?: (i: number, total: number, last: 'created' | 'updated' | 'skipped' | 'error') => void,
  delayMs: number = 200
) {
  let created = 0, updated = 0, skipped = 0, errors = 0;
  const movieIds: string[] = [];

  for (let i = 0; i < imdbIds.length; i++) {
    const id = imdbIds[i];
    try {
      if (!id) {
        skipped++;
        onProgress?.(i + 1, imdbIds.length, 'skipped');
        continue;
      }
      const { movieId, action } = await upsertMovieByImdbId(id, omdbApiKey);
      movieIds.push(movieId);
      action === 'created' ? created++ : updated++;
      onProgress?.(i + 1, imdbIds.length, action);
      if (delayMs > 0) await sleep(delayMs);
    } catch (e) {
      console.error('Catalogue upsert error for IMDb', id, e);
      errors++;
      onProgress?.(i + 1, imdbIds.length, 'error');
    }
  }

  return { totalRequested: imdbIds.length, created, updated, skipped, errors, movieIds };
}
