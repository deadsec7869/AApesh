import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Play, Search } from 'lucide-react';
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
    <div className="listening-home">
      <header className="edition-heading">
        <span className="edition-label">
          AAPESH &nbsp; / &nbsp; Listening room
        </span>
        <time>
          {new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
          }).format(new Date())}
        </time>
      </header>
      <section className="record-feature">
        <div className="feature-copy">
          <span className="edition-label">
            {feature
              ? recent.length
                ? 'Continue listening'
                : 'Selected for you'
              : 'The listening edition'}
          </span>
          <h1>
            {feature?.title ||
              'Good ' +
                (hour < 5 || hour >= 18
                  ? 'evening'
                  : hour < 12
                    ? 'morning'
                    : 'afternoon') +
                '.'}
          </h1>
          <p>
            {feature
              ? feature.artists.map((a) => a.name).join(', ')
              : 'Find a record. Stay for the whole side.'}
          </p>
          {feature ? (
            <button
              className="edition-action"
              onClick={() => play(feature, recent.length ? recent : tracks)}
            >
              <Play size={15} fill="currentColor" /> Play track
            </button>
          ) : (
            <Link className="edition-action" to="/search">
              <Search size={16} /> Find music
            </Link>
          )}
        </div>
        <div className="record-stage" aria-hidden="true">
          <div className="groove-disc">
            <div className="record-label">
              {feature && (
                <ArtworkImage
                  item={feature}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
          <span>SIDE A &nbsp; / &nbsp; 33⅓</span>
        </div>
      </section>
      <nav aria-label="Browse music" className="edition-links">
        {[
          ['Discover', '/discover'],
          ['Liked songs', '/library/liked'],
          ['Your playlists', '/library'],
          ['Listening history', '/history'],
        ].map(([name, path]) => (
          <Link key={path} to={path}>
            {name}
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </nav>
      {recent.length > 0 && (
        <section>
          <h2>Recently played</h2>
          <div className="record-shelf">
            {recent.slice(0, 12).map((t) => (
              <button key={t.videoId} onClick={() => play(t, recent)}>
                <Sleeve track={t} />
                <strong>{t.title}</strong>
                <small>{t.artists.map((a) => a.name).join(', ')}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {tracks.length > 0 && (
        <section>
          <h2>On your frequency</h2>
          <div className="grid lg:grid-cols-2 gap-x-6">
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
          <section key={s.title + i}>
            <h2>{s.title}</h2>
            <div className="record-shelf">
              {s.contents.map((t, j) => (
                <button key={t.id + j} onClick={() => open(t)}>
                  <ArtworkImage item={t} alt="" className="record-cover" />
                  <strong>{t.title}</strong>
                  <small>{t.subtitle || t.type}</small>
                </button>
              ))}
            </div>
          </section>
        ))}
      {followed.length > 0 && (
        <section>
          <h2>Artists you follow</h2>
          <div className="record-shelf">
            {followed.map((a) => (
              <Link
                key={a.id}
                to={
                  a.id.startsWith('UC')
                    ? '/artist/' + a.id
                    : '/search/' + encodeURIComponent(a.name)
                }
              >
                <ArtworkImage
                  src={a.thumbnail}
                  alt=""
                  className="record-cover rounded-full"
                />
                <strong>{a.name}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
      {(status !== 'ready' || (!shelves.length && !tracks.length)) && (
        <div role="status" className="edition-status">
          {status === 'loading' ? (
            'Tuning in to the catalogue…'
          ) : (
            <>
              {status === 'partial'
                ? 'Some catalogue sections could not be loaded.'
                : 'No recommendations are available yet.'}{' '}
              <button onClick={() => retry((n) => n + 1)}>
                Reload catalogue
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
