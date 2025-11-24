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
  const [isOpen, setIsOpen] = useState(false);

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
      <div className="mt-6 text-sm text-xmas-mute">Looking up where to watch…</div>
    );
  }

  if (error) {
    return null;
  }

  const sources = data?.sources || [];

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

  const renderRegionGrid = () => (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
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
          <div
            key={region}
            className="bg-black/10 rounded-md p-3 sm:p-4 flex flex-col gap-3"
          >
            <h3 className="text-sm font-semibold mb-1">{regionLabel}</h3>

            {free.length > 0 && (
              <div>
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
              <div>
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
              <div>
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

  // No sources: still show the card so users know the section exists
  if (!sources.length) {
    return (
      <div className="mt-6">
        <div className="divider"></div>
        <div className="bg-xmas-card/40 border border-xmas-gold/40 rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left px-4 py-3 sm:px-5 sm:py-4 bg-xmas-card/60 hover:bg-xmas-card transition-colors cursor-pointer"
            onClick={() => setIsOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-tv text-xmas-gold"></i>
              <h2 className="text-lg sm:text-xl font-bold flex-1">Where to watch</h2>
            </div>
            <span
              className={`ml-3 text-sm text-xmas-mute transition-transform duration-200 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            >
              <i className="fas fa-chevron-down"></i>
            </span>
          </button>
          {isOpen && (
            <div className="px-4 py-3 sm:px-5 sm:py-5 text-xs text-xmas-mute">
              <p className="mb-2">
                Powered by Watchmode. Availability can change, so please double-check on the provider's site.
              </p>
              <p>We couldn't find any current streaming options via Watchmode for this title.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="divider"></div>
      <div className="bg-xmas-card/40 border border-xmas-gold/40 rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between text-left px-4 py-3 sm:px-5 sm:py-4 bg-xmas-card/60 hover:bg-xmas-card transition-colors cursor-pointer"
          onClick={() => setIsOpen((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <i className="fas fa-tv text-xmas-gold"></i>
            <h2 className="text-lg sm:text-xl font-bold flex-1">Where to watch</h2>
          </div>
          <span
            className={`ml-3 text-sm text-xmas-mute transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <i className="fas fa-chevron-down"></i>
          </span>
        </button>
        {isOpen && (
          <div className="px-4 py-3 sm:px-5 sm:py-5">
            <p className="text-xs text-xmas-mute mb-4">
              Powered by Watchmode. Availability can change, so please double-check on the provider's site.
            </p>
            {renderRegionGrid()}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchProviders;
