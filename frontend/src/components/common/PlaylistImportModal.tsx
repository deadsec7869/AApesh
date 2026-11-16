import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  FolderPlus,
  Music,
} from 'lucide-react';
import { api } from '@/api/client';
import { Track } from '@/types/music';
import { useLibraryStore } from '@/stores/useLibraryStore';

interface PlaylistImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportSource = 'spotify' | 'youtube' | 'm3u';

export const PlaylistImportModal: React.FC<PlaylistImportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { createPlaylist, addTrackToPlaylist } = useLibraryStore();

  const [activeTab, setActiveTab] = useState<ImportSource>('spotify');
  const [urlInput, setUrlInput] = useState('');
  const [m3uContent, setM3uContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [importedTitle, setImportedTitle] = useState('');
  const [matchedTracks, setMatchedTracks] = useState<Track[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setUrlInput('');
    setM3uContent('');
    setError(null);
    setMatchedTracks([]);
    setSelectedIds(new Set());
    setIsLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAnalyze = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'spotify') {
        if (!urlInput.trim()) {
          throw new Error('Please enter a Spotify playlist, album, or track URL');
        }
        const data = await api.importSpotify(urlInput.trim());
        setImportedTitle(data.title || 'Imported Spotify Playlist');
        setMatchedTracks(data.tracks);
        setSelectedIds(new Set(data.tracks.map((t) => t.videoId)));
      } else if (activeTab === 'youtube') {
        if (!urlInput.trim()) {
          throw new Error('Please enter a YouTube Music playlist link');
        }
        const data = await api.importYouTube(urlInput.trim());
        setImportedTitle(data.title || 'Imported YouTube Playlist');
        setMatchedTracks(data.tracks);
        setSelectedIds(new Set(data.tracks.map((t) => t.videoId)));
      } else if (activeTab === 'm3u') {
        if (!m3uContent.trim()) {
          throw new Error('Please enter or upload M3U playlist text');
        }
        const data = await api.importM3U(m3uContent.trim(), importedTitle || 'Imported M3U Playlist');
        setImportedTitle(data.title || 'Imported M3U Playlist');
        setMatchedTracks(data.tracks);
        setSelectedIds(new Set(data.tracks.map((t) => t.videoId)));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to import playlist. Please check the URL or content.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setM3uContent(content);
      const name = file.name.replace(/\.[^/.]+$/, '');
      setImportedTitle(name);
    };
    reader.readAsText(file);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === matchedTracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matchedTracks.map((t) => t.videoId)));
    }
  };

  const toggleTrack = (videoId: string) => {
    const next = new Set(selectedIds);
    if (next.has(videoId)) {
      next.delete(videoId);
    } else {
      next.add(videoId);
    }
    setSelectedIds(next);
  };

  const handleSaveToLibrary = async () => {
    const selectedTracks = matchedTracks.filter((t) => selectedIds.has(t.videoId));
    if (selectedTracks.length === 0) {
      setError('Please select at least one track to import.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const title = importedTitle.trim() || 'Imported Playlist';
      const playlist = await createPlaylist(title, `Imported from ${activeTab.toUpperCase()}`);
      if (!playlist) {
        throw new Error('Failed to create playlist in library');
      }

      for (const track of selectedTracks) {
        await addTrackToPlaylist(playlist.id, track);
      }

      handleClose();
      navigate(`/playlist/${playlist.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to save playlist to library');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl glass-modal border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-neutral-950/90 text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Import External Playlist</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Spotify links, YouTube Music playlists, or local M3U files
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        {matchedTracks.length === 0 && (
          <div className="flex items-center gap-2 p-6 pb-2 border-b border-white/5">
            <button
              onClick={() => {
                setActiveTab('spotify');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-all ${
                activeTab === 'spotify'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              Spotify URL
            </button>
            <button
              onClick={() => {
                setActiveTab('youtube');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-all ${
                activeTab === 'youtube'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              YouTube Music
            </button>
            <button
              onClick={() => {
                setActiveTab('m3u');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-all ${
                activeTab === 'm3u'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              M3U / M3U8 File
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {matchedTracks.length === 0 ? (
            <>
              {activeTab === 'spotify' && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-neutral-300">
                    Paste Spotify Playlist, Album, or Track Link
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                  <p className="text-[11px] text-neutral-400">
                    AAPESH resolves public Spotify playlist and track titles and matches them into high-fidelity YouTube Music streams.
                  </p>
                </div>
              )}

              {activeTab === 'youtube' && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-neutral-300">
                    Paste YouTube or YouTube Music Playlist URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://music.youtube.com/playlist?list=PL..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              )}

              {activeTab === 'm3u' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">
                      M3U / M3U8 Playlist Content
                    </label>
                    <label className="cursor-pointer text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept=".m3u,.m3u8,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    rows={6}
                    value={m3uContent}
                    onChange={(e) => setM3uContent(e.target.value)}
                    placeholder="#EXTM3U&#10;#EXTINF:248,Daft Punk - Get Lucky&#10;daft_punk_get_lucky.mp3"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono placeholder-neutral-500 text-xs focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resolving & Matching Tracks...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>Analyze & Match Tracks</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Results & Review View */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Playlist Title
                  </label>
                  <input
                    type="text"
                    value={importedTitle}
                    onChange={(e) => setImportedTitle(e.target.value)}
                    className="w-full bg-transparent font-bold text-base text-white focus:outline-none"
                  />
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {matchedTracks.length} tracks matched • {selectedIds.size} selected
                  </p>
                </div>

                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-200 transition-colors"
                >
                  {selectedIds.size === matchedTracks.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Matched Tracks List */}
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                {matchedTracks.map((track, idx) => {
                  const isChecked = selectedIds.has(track.videoId);
                  return (
                    <div
                      key={track.videoId || idx}
                      onClick={() => toggleTrack(track.videoId)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                        isChecked
                          ? 'bg-cyan-500/10 border-cyan-500/20 text-white'
                          : 'bg-white/[0.02] border-transparent text-neutral-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-white/20 text-cyan-400 focus:ring-0"
                      />

                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate text-neutral-100">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                        </p>
                      </div>

                      <div className="text-[11px] font-mono text-neutral-400 shrink-0">
                        {track.duration || ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-colors"
                >
                  Import Another
                </button>

                <button
                  onClick={handleSaveToLibrary}
                  disabled={isSaving || selectedIds.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Library...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      <span>Save ({selectedIds.size}) to My Library</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

