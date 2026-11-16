import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  Heart,
  ListPlus,
  Share2,
  Mic2,
  Disc,
  User,
  Calendar,
  Clock,
  Globe,
  Tag,
  AlertCircle,
  ExternalLink,
  Music,
  Check,
  Radio,
  FileText,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSongContext } from '@/hooks/useSongContext';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { getArtworkUrl } from '@/utils/artwork';
import { Track } from '@/types/music';

export const AboutThisSongModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentTrack,
    aboutTrack,
    isPlaying,
    togglePlay,
    playTrack,
    addToQueue,
    isAboutOpen,
    setAboutOpen,
    toggleLyrics,
    atmospherePalette,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const targetTrack = aboutTrack || currentTrack;
  const { context, isLoading, error, refetch } = useSongContext(targetTrack);

  const [copiedToast, setCopiedToast] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const liked = targetTrack ? isLiked(targetTrack.videoId) : false;
  const isPlayingThis = Boolean(isPlaying && currentTrack?.videoId === targetTrack?.videoId);

  // Accessibility: store trigger element and trap focus
  useEffect(() => {
    if (isAboutOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement;
      // Focus modal close button or container
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else {
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    }
  }, [isAboutOpen]);

  // Accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAboutOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setAboutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAboutOpen, setAboutOpen]);

  // Share handler
  const handleShare = useCallback(async () => {
    if (!targetTrack) return;
    const shareUrl = `${window.location.origin}/song/${targetTrack.videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: targetTrack.title,
          text: `Listen to ${targetTrack.title} by ${targetTrack.artists?.[0]?.name || 'Artist'} on AAPESH`,
          url: shareUrl,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2400);
      } catch {
        alert('Link copied to clipboard!');
      }
    }
  }, [targetTrack]);

  // Play / Pause toggle handler for hero
  const handleHeroPlay = useCallback(() => {
    if (!targetTrack) return;
    if (currentTrack?.videoId === targetTrack.videoId) {
      togglePlay();
    } else {
      playTrack(targetTrack);
    }
  }, [targetTrack, currentTrack, togglePlay, playTrack]);

  // Navigate helper that closes modal
  const handleNavigate = useCallback(
    (path: string) => {
      setAboutOpen(false);
      navigate(path);
    },
    [navigate, setAboutOpen]
  );

  // Switch to lyrics experience
  const handleOpenLyrics = useCallback(() => {
    setAboutOpen(false);
    toggleLyrics();
  }, [setAboutOpen, toggleLyrics]);

  if (!isAboutOpen || !targetTrack) {
    return null;
  }

  // Merge canonical targetTrack with enriched context data (never inventing data)
  const displayTitle = context?.title || targetTrack.title;
  const displayArtists = context?.artists?.length ? context.artists : targetTrack.artists || [];
  const displayAlbum = context?.album || targetTrack.album;
  const displayAlbumId = context?.albumId || targetTrack.albumId;
  const displayYear = context?.year || context?.releaseDate;
  const displayDuration = context?.duration || targetTrack.duration;
  const displayArtwork =
    context?.thumbnail || targetTrack.thumbnail || (targetTrack.thumbnails && getArtworkUrl(targetTrack.thumbnails));
  const isExplicit = Boolean(context?.isExplicit ?? targetTrack.isExplicit);

  const credits = context?.credits;
  const artistDetails = context?.artistDetails;
  const albumDetails = context?.albumDetails;
  const related = context?.related;
  const lyricsInfo = context?.lyricsInfo;

  // Real credits categories check
  const hasCredits = Boolean(
    credits &&
      (credits.written_by?.data?.length ||
        credits.produced_by?.data?.length ||
        credits.composed_by?.data?.length ||
        credits.performed_by?.data?.length ||
        credits.music_metadata_provided_by?.data?.length ||
        credits.other_sections?.some((s) => s.data?.length))
  );

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-this-song-title"
        aria-describedby="about-this-song-artist"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden select-none"
      >
        {/* Backdrop Glass Scrim with subtle environmental aura */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={() => setAboutOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xl -z-10"
        >
          {/* Subtle Ambient Radial Glow from Artwork Palette */}
          {atmospherePalette && (
            <div
              className="absolute inset-0 opacity-15 pointer-events-none blur-[120px] transition-opacity duration-700"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${atmospherePalette.glow || atmospherePalette.primary} 0%, transparent 65%)`,
              }}
            />
          )}
        </motion.div>

        {/* Main Floating Cinematic Modal Surface */}
        <motion.div
          ref={modalContainerRef}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl lg:max-w-5xl max-h-[90vh] md:max-h-[86vh] flex flex-col rounded-3xl bg-[#0c0d12]/90 backdrop-blur-3xl border border-white/[0.09] shadow-[0_32px_96px_rgba(0,0,0,0.85)] text-white overflow-hidden"
        >
          {/* ====================================================================
              MODAL HEADER BAR
              ==================================================================== */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                <ArtworkImage
                  src={displayArtwork}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                    About This Song
                  </span>
                  {isExplicit && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-bold border border-white/10">
                      EXPLICIT
                    </span>
                  )}
                </div>
                <h2
                  id="about-this-song-title"
                  className="text-xs sm:text-sm font-semibold text-neutral-200 truncate"
                >
                  {displayTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                ref={closeButtonRef}
                onClick={() => setAboutOpen(false)}
                aria-label="Close About This Song"
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.12] border border-white/[0.08] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ====================================================================
              SCROLLABLE BODY CONTAINER (Contained Internal Scrolling)
              ==================================================================== */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 space-y-8 scroll-smooth focus:outline-none">
            {/* Notice if partial error with Retry */}
            {error && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  onClick={refetch}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ================================================================
                1. COMPACT CONTEXTUAL HERO
                ================================================================ */}
            <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] relative overflow-hidden">
              {/* Artwork Box */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-white/[0.12] bg-[#14161f] shrink-0">
                <ArtworkImage
                  src={displayArtwork}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Metadata Info */}
              <div className="flex-1 flex flex-col justify-between text-center sm:text-left min-w-0 h-full py-1">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-1.5 break-words">
                    {displayTitle}
                  </h1>

                  {/* Artists */}
                  <div id="about-this-song-artist" className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-sm sm:text-base text-neutral-300 mb-2 font-medium">
                    {displayArtists.map((artist, idx) => (
                      <React.Fragment key={artist.id || artist.name || idx}>
                        {idx > 0 && <span className="text-neutral-500">•</span>}
                        {artist.id ? (
                          <button
                            onClick={() => handleNavigate(`/artist/${artist.id}`)}
                            className="hover:text-white hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
                          >
                            {artist.name}
                          </button>
                        ) : (
                          <span>{artist.name}</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Album & Year */}
                  {(displayAlbum || displayYear) && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-400">
                      {displayAlbum && (
                        displayAlbumId ? (
                          <button
                            onClick={() => handleNavigate(`/album/${displayAlbumId}`)}
                            className="hover:text-neutral-200 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded truncate max-w-xs"
                          >
                            {displayAlbum}
                          </button>
                        ) : (
                          <span className="truncate max-w-xs">{displayAlbum}</span>
                        )
                      )}
                      {displayAlbum && displayYear && <span>•</span>}
                      {displayYear && <span>{displayYear}</span>}
                    </div>
                  )}
                </div>

                {/* Quick Action Bar */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-4 mt-auto">
                  {/* Primary Play/Pause */}
                  <button
                    onClick={handleHeroPlay}
                    aria-label={isPlayingThis ? 'Pause song' : 'Play song'}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97] shadow-md"
                  >
                    {isPlayingThis ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                    )}
                    <span>{isPlayingThis ? 'Pause' : 'Play'}</span>
                  </button>

                  {/* Save to Liked */}
                  <button
                    onClick={() => targetTrack && toggleLike(targetTrack)}
                    aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                    title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border text-xs font-medium transition-all ${
                      liked
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current text-rose-500' : ''}`} />
                    <span>{liked ? 'Liked' : 'Like'}</span>
                  </button>

                  {/* Add to Queue */}
                  <button
                    onClick={() => targetTrack && addToQueue(targetTrack)}
                    aria-label="Add to Queue"
                    title="Add to upcoming Queue"
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition-all"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Add to Queue</span>
                  </button>

                  {/* Lyrics Shortcut */}
                  {lyricsInfo?.hasLyrics && (
                    <button
                      onClick={handleOpenLyrics}
                      aria-label="Open Synced Lyrics"
                      title="Open Synced Lyrics Panel"
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition-all"
                    >
                      <Mic2 className="w-3.5 h-3.5 text-neutral-200" />
                      <span>Lyrics</span>
                    </button>
                  )}

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    aria-label="Share song"
                    title="Share link to this song"
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition-all relative"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                    {copiedToast && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-white text-black text-[10px] font-bold shadow-md animate-fade-in">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* ================================================================
                2. SONG INFORMATION & METADATA GRID (Real Data Only)
                ================================================================ */}
            <section className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                Track Details
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayDuration && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      Duration
                    </span>
                    <span className="text-sm font-semibold text-neutral-100 font-mono">
                      {displayDuration}
                    </span>
                  </div>
                )}

                {displayYear && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      Release
                    </span>
                    <span className="text-sm font-semibold text-neutral-100">
                      {context?.releaseDate || displayYear}
                    </span>
                  </div>
                )}

                {displayAlbum && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Disc className="w-3.5 h-3.5 text-neutral-500" />
                      Album
                    </span>
                    <span className="text-sm font-semibold text-neutral-100 truncate">
                      {displayAlbum}
                    </span>
                  </div>
                )}

                {context?.genre && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-neutral-500" />
                      Genre
                    </span>
                    <span className="text-sm font-semibold text-neutral-100 capitalize">
                      {context.genre}
                    </span>
                  </div>
                )}

                {context?.albumType && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Disc className="w-3.5 h-3.5 text-neutral-500" />
                      Format
                    </span>
                    <span className="text-sm font-semibold text-neutral-100 capitalize">
                      {context.albumType}
                    </span>
                  </div>
                )}

                {context?.language && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-neutral-500" />
                      Language
                    </span>
                    <span className="text-sm font-semibold text-neutral-100 uppercase font-mono">
                      {context.language}
                    </span>
                  </div>
                )}

                {lyricsInfo?.hasLyrics && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                      <Mic2 className="w-3.5 h-3.5 text-neutral-500" />
                      Lyrics
                    </span>
                    <span className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {lyricsInfo.synced ? 'Synced' : 'Available'}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* ================================================================
                3. CREDITS (Real Personnel & Authors Only)
                ================================================================ */}
            {hasCredits && credits && (
              <section className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                  Song Credits
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Performed By */}
                  {credits.performed_by && credits.performed_by.data?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                        {credits.performed_by.localized_title || 'Performed By'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {credits.performed_by.data.map((person, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-200 border border-white/[0.06]"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Written By */}
                  {credits.written_by && credits.written_by.data?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                        {credits.written_by.localized_title || 'Written By'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {credits.written_by.data.map((person, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-200 border border-white/[0.06]"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Produced By */}
                  {credits.produced_by && credits.produced_by.data?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                        {credits.produced_by.localized_title || 'Produced By'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {credits.produced_by.data.map((person, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-200 border border-white/[0.06]"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Composed By */}
                  {credits.composed_by && credits.composed_by.data?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                        {credits.composed_by.localized_title || 'Composed By'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {credits.composed_by.data.map((person, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-200 border border-white/[0.06]"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other sections / Labels / Publishers */}
                  {credits.other_sections?.map((sec, sIdx) => {
                    if (!sec.data || sec.data.length === 0) return null;
                    return (
                      <div
                        key={sIdx}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2"
                      >
                        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                          {sec.localized_title}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sec.data.map((item, iIdx) => (
                            <span
                              key={iIdx}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-200 border border-white/[0.06]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Music Metadata Provider */}
                  {credits.music_metadata_provided_by &&
                    credits.music_metadata_provided_by.data?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                          {credits.music_metadata_provided_by.localized_title || 'Metadata Source'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {credits.music_metadata_provided_by.data.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-300 border border-white/[0.06]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </section>
            )}

            {/* ================================================================
                4. ARTIST SPOTLIGHT (If Real Data Available)
                ================================================================ */}
            {artistDetails && (
              <section className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                  Artist Spotlight
                </h3>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {artistDetails.thumbnail ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                      <ArtworkImage
                        src={artistDetails.thumbnail}
                        alt={artistDetails.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-neutral-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-base sm:text-lg font-bold text-white">
                        {artistDetails.name}
                      </h4>
                      {artistDetails.subscribers && (
                        <span className="text-xs font-mono text-neutral-400 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                          {artistDetails.subscribers}
                        </span>
                      )}
                    </div>

                    {artistDetails.description && (
                      <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 leading-relaxed">
                        {artistDetails.description}
                      </p>
                    )}

                    {artistDetails.id && (
                      <button
                        onClick={() => handleNavigate(`/artist/${artistDetails.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:underline pt-1 transition-colors"
                      >
                        <span>View Artist Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ================================================================
                5. ALBUM SPOTLIGHT (If Real Album Available)
                ================================================================ */}
            {albumDetails && (
              <section className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                  Album Information
                </h3>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                    <ArtworkImage
                      src={albumDetails.thumbnail || displayArtwork}
                      alt={albumDetails.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-white truncate">
                      {albumDetails.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      {albumDetails.year && <span>{albumDetails.year}</span>}
                      {albumDetails.year && albumDetails.trackCount && <span>•</span>}
                      {albumDetails.trackCount && (
                        <span>{albumDetails.trackCount} tracks</span>
                      )}
                    </div>
                  </div>

                  {albumDetails.browseId && (
                    <button
                      onClick={() => handleNavigate(`/album/${albumDetails.browseId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-neutral-200 hover:text-white transition-all shrink-0"
                    >
                      <span>View Album</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* ================================================================
                6. RELATED DISCOVERY (From Album / More from Artist)
                ================================================================ */}
            {related && (
              <div className="space-y-6">
                {/* From this Album */}
                {related.fromAlbum && related.fromAlbum.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                      From This Album
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {related.fromAlbum.slice(0, 6).map((track) => (
                        <div
                          key={track.videoId}
                          className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                        >
                          <div
                            onClick={() => {
                              playTrack(track, related.fromAlbum);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 shrink-0 relative">
                              <ArtworkImage
                                src={track.thumbnail || (track.thumbnails && getArtworkUrl(track.thumbnails))}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                                {track.title}
                              </h5>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {track.artists?.[0]?.name || 'Artist'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => addToQueue(track)}
                              aria-label={`Add ${track.title} to queue`}
                              title="Add to queue"
                              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => playTrack(track, related.fromAlbum)}
                              aria-label={`Play ${track.title}`}
                              className="p-1.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all"
                            >
                              <Play className="w-3 h-3 fill-current translate-x-0.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* More from Artist */}
                {related.moreFromArtist && related.moreFromArtist.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                      More from {displayArtists[0]?.name || 'Artist'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {related.moreFromArtist.slice(0, 6).map((track) => (
                        <div
                          key={track.videoId}
                          className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                        >
                          <div
                            onClick={() => {
                              playTrack(track, related.moreFromArtist);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                              <ArtworkImage
                                src={track.thumbnail || (track.thumbnails && getArtworkUrl(track.thumbnails))}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                                {track.title}
                              </h5>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {track.album || track.artists?.[0]?.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => addToQueue(track)}
                              aria-label={`Add ${track.title} to queue`}
                              title="Add to queue"
                              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => playTrack(track, related.moreFromArtist)}
                              aria-label={`Play ${track.title}`}
                              className="p-1.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all"
                            >
                              <Play className="w-3 h-3 fill-current translate-x-0.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* You Might Also Like */}
                {(!related.fromAlbum || related.fromAlbum.length === 0) &&
                  (!related.moreFromArtist || related.moreFromArtist.length === 0) &&
                  related.youMightLike &&
                  related.youMightLike.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold px-1">
                        You Might Also Like
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {related.youMightLike.slice(0, 6).map((track) => (
                          <div
                            key={track.videoId}
                            className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                          >
                            <div
                              onClick={() => {
                                playTrack(track, related.youMightLike);
                              }}
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                                <ArtworkImage
                                  src={track.thumbnail || (track.thumbnails && getArtworkUrl(track.thumbnails))}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                                  {track.title}
                                </h5>
                                <p className="text-[11px] text-neutral-400 truncate">
                                  {track.artists?.[0]?.name || 'Artist'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => addToQueue(track)}
                                aria-label={`Add ${track.title} to queue`}
                                title="Add to queue"
                                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                <ListPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => playTrack(track, related.youMightLike)}
                                aria-label={`Play ${track.title}`}
                                className="p-1.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all"
                              >
                                <Play className="w-3 h-3 fill-current translate-x-0.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
              </div>
            )}

            {/* Skeletons while loading initial metadata */}
            {isLoading && !hasCredits && !artistDetails && (
              <div className="space-y-4 animate-pulse pt-2">
                <div className="h-3 w-28 rounded bg-white/[0.06]" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.04]" />
                  <div className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.04]" />
                </div>
              </div>
            )}

            {/* Metadata Attribution Source */}
            <footer className="pt-4 pb-1 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <span>Verified Music Metadata</span>
              <span>Source: {context?.dataSource || 'YouTube Music'}</span>
            </footer>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
