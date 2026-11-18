import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Compass, Heart, History, Library, Play, Search } from 'lucide-react';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { api } from '@/api/client';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { TrackRow } from '@/components/music/TrackRow';
import type { Shelf, ShelfItem, Track } from '@/types/music';

function Sleeve({ track }: { track: Track }) {
  const seed = Array.from(track.videoId).reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
  const style = {
    '--sleeve-angle': 25 + (seed % 110) + 'deg',
    '--sleeve-tone': ['#705c4b', '#44594c', '#51596c', '#614e59', '#626446'][
      seed % 5
    ],
  } as React.CSSProperties;
  return (
    <ArtworkImage
      item={track}
      alt=""
      className="record-cover relative"
      fallbackIcon={
        <span className="sleeve-mark" style={style} aria-hidden="true">
          <b>{track.title.slice(0, 2)}</b>
        </span>
      }
    />
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.playTrack);
  const recent = usePlayerStore((s) => s.recentlyPlayed);
  const followed = useLibraryStore((s) => s.followedArtists);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'partial'>(
    'loading',
  );
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.allSettled([api.getHome(8), api.getRecommendations(12)]).then(
      ([home, picks]) => {
        if (!active) return;
        if (home.status === 'fulfilled') setShelves(home.value.shelves || []);
        if (picks.status === 'fulfilled') setTracks(picks.value);
        setStatus(
          home.status === 'rejected' || picks.status === 'rejected'
            ? 'partial'
            : 'ready',
        );
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  const feature = recent[0] || tracks[0];
  const hour = new Date().getHours();
  function open(item: ShelfItem) {
    if (item.type === 'song' && item.videoId)
      play({ ...item, videoId: item.videoId, artists: item.artists || [] });
    else
      navigate(
        '/' +
          (item.type === 'song' ? 'search' : item.type) +
          '/' +
          encodeURIComponent(
            item.type === 'song' ? item.title : item.browseId || item.id,
          ),
      );
  }
  return (
    <div className="listening-home w-full max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
      <header className="edition-heading flex items-center justify-between mb-8">
        <span className="caption">
          AAPESH &nbsp; / &nbsp; Listening room
        </span>
        <time className="text-tertiary text-sm font-mono">
          {new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
          }).format(new Date())}
        </time>
      </header>
      <GlassSurface
        className="feature-record mb-8"
        preset="prominent"
        interactive
        lens={false}
        refraction="none"
      >
        <section className="feature-record-inner p-6 md:p-8" aria-label="Featured listening">
          <div className="feature-copy min-w-0">
            <span className="caption block mb-3">
              {feature
                ? recent.length
                  ? 'Continue listening'
                  : 'Selected for you'
                : 'The listening room'}
            </span>
            <h1 className="heading text-3xl md:text-4xl lg:text-5xl mb-3">
              {feature?.title ||
                'Good ' +
                  (hour < 5 || hour >= 18
                    ? 'evening'
                    : hour < 12
                      ? 'morning'
                      : 'afternoon') +
                  '.'}
            </h1>
            <p className="body text-base md:text-lg text-tertiary mb-6">
              {feature
                ? feature.artists.map((a) => a.name).join(', ')
                : 'Find a record. Stay for the whole side.'}
            </p>
            {feature ? (
              <button
                className="btn-primary px-6 py-3"
                onClick={() => play(feature, recent.length ? recent : tracks)}
              >
                <Play size={18} fill="currentColor" className="mr-2" /> Play track
              </button>
            ) : (
              <Link className="btn-ghost px-6 py-3" to="/search">
                <Search size={18} className="mr-2" /> Find music
              </Link>
            )}
          </div>
          <div className="record-stage" aria-hidden="true">
            <div className="groove-disc">
              <div className="record-label">
                {feature ? (
                  <ArtworkImage
                    item={feature}
                    alt=""
                    className="feature-record-art"
                  />
                ) : (
                  <span className="record-label-mark">A</span>
                )}
              </div>
            </div>
            <span className="caption">SIDE A&nbsp; / &nbsp;33⅓ RPM</span>
          </div>
        </section>
      </GlassSurface>
      <GlassSurface
        className="browse-links mb-8 p-2"
        preset="subtle"
        lens={false}
        refraction="none"
      >
        <nav aria-label="Browse music" className="browse-links flex flex-wrap gap-1">
          {[
            { name: 'Discover', path: '/discover', Icon: Compass },
            { name: 'Liked songs', path: '/library/liked', Icon: Heart },
            { name: 'Your playlists', path: '/library', Icon: Library },
            { name: 'Listening history', path: '/history', Icon: History },
          ].map(({ name, path, Icon }) => (
            <Link key={path} to={path} className="browse-link px-4 py-2.5 flex items-center gap-2 text-sm font-medium transition-colors">
              <Icon size={16} aria-hidden="true" />
              <span>{name}</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </GlassSurface>
      {recent.length > 0 && (
        <section className="mb-12">
          <h2 className="heading text-2xl mb-6">Recently played</h2>
          <div className="record-shelf flex flex-wrap gap-6">
            {recent.slice(0, 12).map((t) => (
              <button key={t.videoId} onClick={() => play(t, recent)} className="group flex flex-col items-center w-40 sm:w-44 transition-all duration-300 ease-out-expo">
                <Sleeve track={t} />
                <strong className="mt-3 text-sm font-medium text-white group-hover:text-white truncate w-full text-center">{t.title}</strong>
                <small className="text-[11px] text-tertiary truncate block w-full text-center mt-1">{t.artists.map((a) => a.name).join(', ')}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {tracks.length > 0 && (
        <section className="mb-12">
          <h2 className="heading text-2xl mb-6">On your frequency</h2>
          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {tracks.slice(0, 8).map((t, i) => (
              <TrackRow
                key={t.videoId}
                track={t}
                index={i}
                contextQueue={tracks}
              />
            ))}
          </div>
        </section>
      )}
      {shelves
        .filter((s) => s.contents?.length)
        .map((s, i) => (
          <section key={s.title + i} className="mb-12">
            <h2 className="heading text-2xl mb-6">{s.title}</h2>
            <div className="record-shelf flex flex-wrap gap-6">
              {s.contents.map((t, j) => (
                <button key={t.id + j} onClick={() => open(t)} className="group flex flex-col items-center w-40 sm:w-44 transition-all duration-300 ease-out-expo">
                  <ArtworkImage item={t} alt="" className="artwork w-full aspect-square mb-3" />
                  <strong className="text-sm font-medium text-white group-hover:text-white truncate w-full text-center">{t.title}</strong>
                  <small className="text-[11px] text-tertiary truncate block w-full text-center mt-1">{t.subtitle || t.type}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      {followed.length > 0 && (
        <section className="mb-12">
          <h2 className="heading text-2xl mb-6">Artists you follow</h2>
          <div className="record-shelf flex flex-wrap gap-6">
            {followed.map((a) => (
              <Link
                key={a.id}
                to={
                  a.id.startsWith('UC')
                    ? '/artist/' + a.id
                    : '/search/' + encodeURIComponent(a.name)
                }
                className="group flex flex-col items-center w-40 sm:w-44 transition-all duration-300 ease-out-expo"
              >
                <ArtworkImage
                  src={a.thumbnail}
                  alt=""
                  className="artwork w-full aspect-square rounded-full mb-3"
                />
                <strong className="text-sm font-medium text-white group-hover:text-white truncate w-full text-center">{a.name}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
      {(status !== 'ready' || (!shelves.length && !tracks.length)) && (
        <div role="status" className="glass-interactive p-8 rounded-2xl text-center">
          {status === 'loading' ? (
            'Tuning in to the catalogue…'
          ) : (
            <>
              {status === 'partial'
                ? 'Some catalogue sections could not be loaded.'
                : 'No recommendations are available yet.'}{' '}
              <button onClick={() => retry((n) => n + 1)} className="btn-primary mt-4 px-6 py-2">
                Reload catalogue
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}