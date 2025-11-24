import React, { useEffect, useState } from 'react';
import { Movie } from '../types/movie';
import { useWatchmodeSources } from '../hooks/useWatchmodeSources';
import { getWatchmodeSourcesMeta } from '../services/watchmodeService';
import type { WatchmodeSourceMetaMap } from '../types/watchmode';

interface Props {
  movie: Movie | null;
}

const WatchProviders: React.FC<Props> = ({ movie }) => {
  const { loading, error, data } = useWatchmodeSources(movie);
  const [metaMap, setMetaMap] = useState<WatchmodeSourceMetaMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      const meta = await getWatchmodeSourcesMeta();
      if (!cancelled) {
        setMetaMap(meta);
      }
    };
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!movie) return null;
  if (!import.meta.env.VITE_WATCHMODE_API_KEY) return null;

  if (loading && !data) {
    return (
      <div className="mt-6 text-sm text-xmas-mute">Looking up where to watch in the UK…</div>
    );
  }

  if (error) {
    return null;
  }

  const sources = data?.sources || [];

  if (!sources.length) {
    return (
      <div className="mt-6">
        <div className="divider"></div>
        <h2 className="text-xl font-bold mb-2">Where to watch in the UK</h2>
        <p className="text-xs text-xmas-mute">
          We couldn&apos;t find any current UK streaming options via Watchmode for this title.
        </p>
      </div>
    );
  }

  // Group by region then by type (subscription vs purchase/rent)
  const regionsOrder = ['GB', 'US', 'CA'];

  const sourcesByRegion: Record<string, typeof sources> = {};
  for (const s of sources) {
    const region = (s.region || '').toUpperCase();
    if (!sourcesByRegion[region]) sourcesByRegion[region] = [];
    sourcesByRegion[region].push(s);
  }

  const uniqueByName = (items: typeof sources) => {
    const map = new Map<string, (typeof items)[number]>();
    for (const s of items) {
      if (!map.has(s.name)) map.set(s.name, s);
    }
    return Array.from(map.values());
  };

  return (
    <div className="mt-6">
      <div className="divider"></div>
      <h2 className="text-xl font-bold mb-2">Where to watch</h2>
      <p className="text-xs text-xmas-mute mb-3">
        Powered by Watchmode. Availability can change, so please double-check on the provider&apos;s site.
      </p>

      {regionsOrder.map((region) => {
        const list = sourcesByRegion[region];
        if (!list || !list.length) return null;

        const subscription = list.filter((s) => s.type === 'sub' || s.type === 'subscription');
        const purchaseOrRent = list.filter((s) =>
          s.type === 'buy' || s.type === 'rent' || s.type === 'purchase' || s.type === 'buy/rent'
        );
        const free = list.filter((s) => s.type === 'free');

        if (!subscription.length && !purchaseOrRent.length && !free.length) return null;

        const regionLabel = region === 'GB' ? 'UK' : region;

        return (
          <div key={region} className="mb-4">
            <h3 className="text-sm font-semibold mb-2">{regionLabel}</h3>

            {free.length > 0 && (
              <div className="mb-2">
                <div className="text-xs uppercase tracking-wide text-xmas-mute mb-1">Free</div>
                <div className="flex flex-wrap gap-3">
                  {uniqueByName(free).map((s) => {
                    const meta = metaMap ? metaMap[s.source_id] : undefined;
                    if (!meta?.logo_100px) return null;
                    return (
                      <a
                        key={s.name + s.web_url}
                        href={s.web_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={meta.logo_100px}
                          alt={s.name}
                          className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                          loading="lazy"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {subscription.length > 0 && (
              <div className="mb-2">
                <div className="text-xs uppercase tracking-wide text-xmas-mute mb-1">Streaming</div>
                <div className="flex flex-wrap gap-3">
                  {uniqueByName(subscription).map((s) => {
                    const meta = metaMap ? metaMap[s.source_id] : undefined;
                    if (!meta?.logo_100px) return null;
                    return (
                      <a
                        key={s.name + s.web_url}
                        href={s.web_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={meta.logo_100px}
                          alt={s.name}
                          className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                          loading="lazy"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {purchaseOrRent.length > 0 && (
              <div className="mb-1">
                <div className="text-xs uppercase tracking-wide text-xmas-mute mb-1">Buy / Rent</div>
                <div className="flex flex-wrap gap-3">
                  {uniqueByName(purchaseOrRent).map((s) => {
                    const meta = metaMap ? metaMap[s.source_id] : undefined;
                    if (!meta?.logo_100px) return null;
                    return (
                      <a
                        key={s.name + s.web_url}
                        href={s.web_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={meta.logo_100px}
                          alt={s.name}
                          className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                          loading="lazy"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WatchProviders;
