import React, { useMemo, useState, useSyncExternalStore } from 'react';
import type { Track } from '@/types/music';
import { registerLocalFiles, forgetLocalFile } from '@/services/player/localFiles';
import { usePlayerStore } from '@/stores/usePlayerStore';

let collection: Track[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => collection;
const publish = (tracks: Track[]) => { collection = tracks; listeners.forEach(listener => listener()); };

export function LocalLibraryPanel() {
  const tracks = useSyncExternalStore(subscribe, snapshot);
  const [query, setQuery] = useState('');
  const [scroll, setScroll] = useState(0);
  const [error, setError] = useState('');
  const currentId = usePlayerStore(state => state.currentTrack?.videoId);
  const filtered = useMemo(() => tracks.filter(track => track.title.toLowerCase().includes(query.toLowerCase())), [tracks, query]);
  const start = Math.max(0, Math.min(Math.floor(scroll / 64) - 3, Math.max(0, filtered.length - 8)));
  const visible = filtered.slice(start, start + 14);
  return <section className="local-library-panel" aria-labelledby="local-library-heading">
    <div className="local-library-heading">
      <div><p className="workstation-eyebrow">On this device · Real audio analysis</p><h2 id="local-library-heading">Local listening room</h2></div>
      <label className="local-import-button">Import audio
        <input type="file" multiple accept="audio/*,.flac,.mp3,.wav" aria-label="Import local audio files" onChange={event => {
          try {
            const imported = registerLocalFiles(Array.from(event.target.files ?? []));
            publish([...tracks, ...imported]);
            setError(imported.length ? '' : 'Choose an MP3, FLAC, WAV or another supported audio file.');
          } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to import files.'); }
          event.target.value = '';
        }} />
      </label>
    </div>
    <p className="local-library-note">Files stay on your device. Re-import after restarting. EQ and live FFT are available during local playback.</p>
    {error && <p role="alert">{error}</p>}
    {tracks.length > 0 && <input className="local-filter" type="search" aria-label="Filter local audio" placeholder="Filter your files…" value={query} onChange={event => { setQuery(event.target.value); setScroll(0); }} />}
    {!tracks.length ? <div className="local-empty">Drop into your own collection. Import audio to begin.</div> :
      <div className="local-track-window" role="list" aria-label="Local audio files" onScroll={event => setScroll(event.currentTarget.scrollTop)}>
        <div style={{ height: filtered.length * 64, position: 'relative' }}>
          {visible.map((track, index) => <div key={track.videoId} role="listitem" className="local-track-row" style={{ position: 'absolute', top: (start + index) * 64, height: 64, left: 0, right: 0 }}>
            <button aria-label={`Play ${track.title}`} aria-current={track.videoId === currentId ? 'true' : undefined} onClick={() => void usePlayerStore.getState().playTrack(track, filtered)}>
              <span className="local-track-icon">{track.videoId === currentId ? '♫' : '▶'}</span><span><strong>{track.title}</strong><small>Local file · Original quality</small></span>
            </button>
            <button className="local-remove" aria-label={`Remove ${track.title}`} onClick={() => {
              if (currentId === track.videoId) usePlayerStore.getState().pause();
              forgetLocalFile(track.videoId); publish(tracks.filter(item => item.videoId !== track.videoId));
            }}>×</button>
          </div>)}
        </div>
      </div>}
    {tracks.length > 0 && !filtered.length && <p role="status">No matching local files.</p>}
  </section>;
}
