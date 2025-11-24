import { useEffect, useState } from 'react';
import { Movie } from '../types/movie';
import { CachedWatchmodeSources } from '../types/watchmode';
import { getWatchmodeSourcesForMovie } from '../services/watchmodeService';

interface State {
  loading: boolean;
  error: string | null;
  data: CachedWatchmodeSources | null;
}

export function useWatchmodeSources(movie: Movie | null) : State {
  const [state, setState] = useState<State>({ loading: false, error: null, data: null });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!movie) {
        setState({ loading: false, error: null, data: null });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await getWatchmodeSourcesForMovie(movie);
        if (cancelled) return;
        setState({ loading: false, error: null, data: result });
      } catch (err) {
        console.error('useWatchmodeSources error', err);
        if (cancelled) return;
        setState({ loading: false, error: 'Failed to load streaming info', data: null });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [movie?.id]);

  return state;
}
