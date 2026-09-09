import os
import re
import json
import urllib.request
import urllib.parse
import logging
from typing import List, Dict, Any, Optional
from ytmusicapi import YTMusic
from backend.app.core.config import settings
from backend.app.services.cache_service import cache_service
from backend.app.services.lyrics_engine import CompositeLyricsService, parse_lrc_lines

logger = logging.getLogger("aurora.ytmusic")


class YTMusicService:
    def __init__(self):
        self._yt: Optional[YTMusic] = None
        self._is_authenticated = False
        self.lyrics_engine = CompositeLyricsService()
        self._init_client()

    def _init_client(self):
        oauth_path = settings.YTMUSIC_OAUTH_TOKEN_PATH
        headers_path = settings.YTMUSIC_HEADERS_PATH

        if os.path.exists(oauth_path):
            try:
                self._yt = YTMusic(oauth_path)
                self._is_authenticated = True
                logger.info("YTMusic initialized with OAuth token: %s", oauth_path)
                return
            except Exception as e:
                logger.warning("Failed to initialize YTMusic with OAuth: %s", e)

        if os.path.exists(headers_path):
            try:
                self._yt = YTMusic(headers_path)
                self._is_authenticated = True
                logger.info("YTMusic initialized with headers: %s", headers_path)
                return
            except Exception as e:
                logger.warning("Failed to initialize YTMusic with headers: %s", e)

        # Fallback to unauthenticated client
        try:
            self._yt = YTMusic()
            self._is_authenticated = False
            logger.info("YTMusic initialized in unauthenticated mode.")
        except Exception as e:
            logger.error("Failed to initialize YTMusic: %s", e)
            self._yt = None

    @property
    def is_authenticated(self) -> bool:
        return self._is_authenticated

    @property
    def client(self) -> YTMusic:
        if self._yt is None:
            self._init_client()
        if self._yt is None:
            raise RuntimeError("YTMusic client is unavailable.")
        return self._yt

    # Normalization Helpers
    def _extract_thumbnails(self, item: Dict[str, Any]) -> List[Dict[str, Any]]:
        raw = item.get("thumbnails", [])
        if not raw and "thumbnail" in item:
            thumb = item.get("thumbnail")
            if isinstance(thumb, str):
                return [{"url": thumb}]
            elif isinstance(thumb, list):
                raw = thumb
        results = []
        for t in raw:
            if isinstance(t, dict) and "url" in t:
                results.append({
                    "url": t.get("url", ""),
                    "width": t.get("width"),
                    "height": t.get("height"),
                })
        return results

    def _best_thumbnail(self, item: Dict[str, Any]) -> str:
        thumbs = self._extract_thumbnails(item)
        if not thumbs:
            return ""
        # Return largest available
        return thumbs[-1]["url"]

    def _normalize_artists(self, raw_artists: Any) -> List[Dict[str, Any]]:
        if not raw_artists:
            return []
        if isinstance(raw_artists, list):
            artists = []
            for a in raw_artists:
                if isinstance(a, dict):
                    artists.append({"id": a.get("id"), "name": a.get("name", "Unknown Artist")})
                elif isinstance(a, str):
                    artists.append({"id": None, "name": a})
            return artists
        elif isinstance(raw_artists, str):
            return [{"id": None, "name": raw_artists}]
        return []

    def _normalize_track(self, item: Dict[str, Any]) -> Dict[str, Any]:
        video_id = item.get("videoId") or item.get("id") or ""
        title = item.get("title") or "Unknown Title"
        artists = self._normalize_artists(item.get("artists"))
        
        album_name = None
        album_id = None
        raw_album = item.get("album")
        if isinstance(raw_album, dict):
            album_name = raw_album.get("name")
            album_id = raw_album.get("id")
        elif isinstance(raw_album, str):
            album_name = raw_album

        duration = item.get("duration") or "0:00"
        duration_seconds = item.get("duration_seconds")
        if not duration_seconds and duration and ":" in duration:
            try:
                parts = [int(p) for p in duration.split(":")]
                if len(parts) == 2:
                    duration_seconds = parts[0] * 60 + parts[1]
                elif len(parts) == 3:
                    duration_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
            except Exception:
                duration_seconds = 0

        thumbs = self._extract_thumbnails(item)
        thumb_url = self._best_thumbnail(item)

        return {
            "videoId": video_id,
            "title": title,
            "artists": artists,
            "album": album_name,
            "albumId": album_id,
            "duration": duration,
            "duration_seconds": duration_seconds or 0,
            "thumbnails": thumbs,
            "thumbnail": thumb_url,
            "isExplicit": bool(item.get("isExplicit", False)),
        }

    # Core API Endpoints
    def get_home(self, limit: int = 6) -> Dict[str, Any]:
        cache_key = f"home_feed_{limit}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw_shelves = self.client.get_home(limit=limit)
        except Exception as e:
            logger.error("Error fetching get_home: %s", e)
            raw_shelves = []

        shelves = []
        for shelf in raw_shelves:
            shelf_title = shelf.get("title", "")
            if not shelf_title:
                continue
            
            raw_contents = shelf.get("contents", [])
            items = []
            for c in raw_contents:
                content_type = c.get("type", "").lower()
                c_id = c.get("videoId") or c.get("browseId") or c.get("playlistId") or ""
                c_title = c.get("title", "")
                if not c_title:
                    continue

                artists = self._normalize_artists(c.get("artists") or c.get("subtitle"))
                subtitle = ""
                if isinstance(c.get("subtitle"), str):
                    subtitle = c.get("subtitle")
                elif artists:
                    subtitle = ", ".join([a["name"] for a in artists])

                # determine type
                inferred_type = "song"
                if "playlist" in content_type or "playlistId" in c:
                    inferred_type = "playlist"
                elif "album" in content_type or (c.get("browseId", "").startswith("MPRE")):
                    inferred_type = "album"
                elif "artist" in content_type or (c.get("browseId", "").startswith("UC")):
                    inferred_type = "artist"
                elif c.get("videoId"):
                    inferred_type = "song"

                items.append({
                    "id": c_id,
                    "title": c_title,
                    "subtitle": subtitle,
                    "type": inferred_type,
                    "thumbnail": self._best_thumbnail(c),
                    "thumbnails": self._extract_thumbnails(c),
                    "artists": artists,
                    "videoId": c.get("videoId"),
                    "browseId": c.get("browseId"),
                    "duration": c.get("duration"),
                })

            if items:
                shelves.append({
                    "title": shelf_title,
                    "contents": items,
                })

        result = {"shelves": shelves}
        cache_service.set(cache_key, result, ttl=900)  # 15 minutes
        return result

    def search(self, query: str, filter_type: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        cache_key = f"search_{query}_{filter_type}_{limit}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        results: Dict[str, Any] = {
            "query": query,
            "topResult": None,
            "songs": [],
            "albums": [],
            "artists": [],
            "playlists": [],
            "videos": [],
        }

        try:
            if filter_type:
                # e.g. songs, albums, artists, playlists, videos
                raw_results = self.client.search(query, filter=filter_type, limit=limit)
            else:
                raw_results = self.client.search(query, limit=limit)
        except Exception as e:
            logger.error("Error executing search: %s", e)
            raw_results = []

        for item in raw_results:
            category = (item.get("category") or item.get("resultType") or "").lower()
            
            if "song" in category:
                norm_song = self._normalize_track(item)
                results["songs"].append(norm_song)
            elif "album" in category:
                results["albums"].append({
                    "browseId": item.get("browseId") or "",
                    "title": item.get("title", ""),
                    "type": item.get("type", "Album"),
                    "year": item.get("year"),
                    "artists": self._normalize_artists(item.get("artists")),
                    "thumbnails": self._extract_thumbnails(item),
                    "thumbnail": self._best_thumbnail(item),
                    "trackCount": item.get("trackCount"),
                })
            elif "artist" in category:
                results["artists"].append({
                    "channelId": item.get("browseId") or "",
                    "name": item.get("artist") or item.get("title", ""),
                    "subscribers": item.get("subscribers"),
                    "thumbnails": self._extract_thumbnails(item),
                    "thumbnail": self._best_thumbnail(item),
                })
            elif "playlist" in category:
                results["playlists"].append({
                    "id": item.get("browseId") or item.get("id") or "",
                    "title": item.get("title", ""),
                    "description": item.get("description", ""),
                    "author": item.get("author", ""),
                    "itemCount": item.get("itemCount"),
                    "thumbnails": self._extract_thumbnails(item),
                    "thumbnail": self._best_thumbnail(item),
                })
            elif "video" in category:
                norm_video = self._normalize_track(item)
                results["videos"].append(norm_video)

        # If general search has results, establish topResult
        if results["songs"]:
            results["topResult"] = {"type": "song", "data": results["songs"][0]}
        elif results["artists"]:
            results["topResult"] = {"type": "artist", "data": results["artists"][0]}
        elif results["albums"]:
            results["topResult"] = {"type": "album", "data": results["albums"][0]}

        cache_service.set(cache_key, results, ttl=600)  # 10 minutes
        return results

    def get_search_suggestions(self, query: str) -> List[str]:
        cache_key = f"suggest_{query}"
        cached = cache_service.get(cache_key)
        if cached is not None:
            return cached

        try:
            suggestions = self.client.get_search_suggestions(query)
            if not isinstance(suggestions, list):
                suggestions = []
            clean_suggestions = []
            for s in suggestions:
                if isinstance(s, str):
                    clean_suggestions.append(s)
                elif isinstance(s, dict) and "query" in s:
                    clean_suggestions.append(s["query"])
            cache_service.set(cache_key, clean_suggestions, ttl=1800)
            return clean_suggestions
        except Exception as e:
            logger.error("Error getting search suggestions: %s", e)
            return []

    def get_song(self, video_id: str) -> Dict[str, Any]:
        cache_key = f"song_{video_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            song_data = self.client.get_song(video_id)
            details = song_data.get("videoDetails", {})
            title = details.get("title", "")
            author = details.get("author", "")
            duration_seconds = int(details.get("lengthSeconds", 0))
            mins = duration_seconds // 60
            secs = duration_seconds % 60
            duration_str = f"{mins}:{secs:02d}"

            norm = {
                "videoId": video_id,
                "title": title,
                "artists": [{"id": details.get("channelId"), "name": author}],
                "album": None,
                "albumId": None,
                "duration": duration_str,
                "duration_seconds": duration_seconds,
                "thumbnails": self._extract_thumbnails(details),
                "thumbnail": self._best_thumbnail(details),
                "isExplicit": False,
            }
            cache_service.set(cache_key, norm, ttl=3600)
            return norm
        except Exception as e:
            logger.error("Error fetching song details for %s: %s", video_id, e)
            return {
                "videoId": video_id,
                "title": "Song",
                "artists": [{"name": "Artist"}],
                "duration": "0:00",
                "duration_seconds": 0,
                "thumbnails": [],
                "thumbnail": "",
                "isExplicit": False,
            }

    def get_album(self, browse_id: str) -> Dict[str, Any]:
        cache_key = f"album_{browse_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_album(browse_id)
            tracks = []
            for t in raw.get("tracks", []):
                tracks.append(self._normalize_track(t))

            result = {
                "browseId": browse_id,
                "title": raw.get("title", "Unknown Album"),
                "description": raw.get("description", ""),
                "artists": self._normalize_artists(raw.get("artists")),
                "year": raw.get("year"),
                "trackCount": raw.get("trackCount") or len(tracks),
                "duration": raw.get("duration"),
                "thumbnails": self._extract_thumbnails(raw),
                "thumbnail": self._best_thumbnail(raw),
                "tracks": tracks,
            }
            cache_service.set(cache_key, result, ttl=3600)
            return result
        except Exception as e:
            logger.error("Error fetching album %s: %s", browse_id, e)
            return {"error": str(e), "browseId": browse_id, "tracks": []}

    def get_artist(self, channel_id: str) -> Dict[str, Any]:
        cache_key = f"artist_{channel_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_artist(channel_id)
            
            top_songs = []
            for s in raw.get("songs", {}).get("results", []):
                top_songs.append(self._normalize_track(s))

            albums = []
            for a in raw.get("albums", {}).get("results", []):
                albums.append({
                    "browseId": a.get("browseId", ""),
                    "title": a.get("title", ""),
                    "year": a.get("year"),
                    "thumbnails": self._extract_thumbnails(a),
                    "thumbnail": self._best_thumbnail(a),
                })

            singles = []
            for s in raw.get("singles", {}).get("results", []):
                singles.append({
                    "browseId": s.get("browseId", ""),
                    "title": s.get("title", ""),
                    "year": s.get("year"),
                    "thumbnails": self._extract_thumbnails(s),
                    "thumbnail": self._best_thumbnail(s),
                })

            related = []
            for r in raw.get("related", {}).get("results", []):
                related.append({
                    "id": r.get("browseId"),
                    "name": r.get("title", ""),
                })

            result = {
                "channelId": channel_id,
                "name": raw.get("name", "Unknown Artist"),
                "description": raw.get("description", ""),
                "subscribers": raw.get("subscribers"),
                "views": raw.get("views"),
                "thumbnails": self._extract_thumbnails(raw),
                "thumbnail": self._best_thumbnail(raw),
                "topSongs": top_songs,
                "albums": albums,
                "singles": singles,
                "relatedArtists": related,
            }
            cache_service.set(cache_key, result, ttl=3600)
            return result
        except Exception as e:
            logger.error("Error fetching artist %s: %s", channel_id, e)
            return {"error": str(e), "channelId": channel_id, "topSongs": []}

    def get_playlist(self, playlist_id: str) -> Dict[str, Any]:
        cache_key = f"playlist_{playlist_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_playlist(playlist_id)
            tracks = []
            for t in raw.get("tracks", []):
                tracks.append(self._normalize_track(t))

            result = {
                "id": playlist_id,
                "title": raw.get("title", "Playlist"),
                "description": raw.get("description", ""),
                "author": raw.get("author", {}).get("name") if isinstance(raw.get("author"), dict) else str(raw.get("author", "")),
                "trackCount": raw.get("trackCount") or len(tracks),
                "duration": raw.get("duration"),
                "thumbnails": self._extract_thumbnails(raw),
                "thumbnail": self._best_thumbnail(raw),
                "tracks": tracks,
            }
            cache_service.set(cache_key, result, ttl=1800)
            return result
        except Exception as e:
            logger.error("Error fetching playlist %s: %s", playlist_id, e)
            return {"error": str(e), "id": playlist_id, "tracks": []}

    def get_watch_playlist(self, video_id: str, playlist_id: Optional[str] = None) -> Dict[str, Any]:
        cache_key = f"watch_{video_id}_{playlist_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_watch_playlist(videoId=video_id, playlistId=playlist_id)
            tracks = []
            for t in raw.get("tracks", []):
                tracks.append(self._normalize_track(t))

            result = {
                "videoId": video_id,
                "playlistId": raw.get("playlistId"),
                "lyricsBrowseId": raw.get("lyrics"),
                "tracks": tracks,
            }
            cache_service.set(cache_key, result, ttl=1800)
            return result
        except Exception as e:
            logger.error("Error getting watch playlist for %s: %s", video_id, e)
            return {"videoId": video_id, "tracks": [], "lyricsBrowseId": None}

    def parse_lrc(self, text: str) -> List[Dict[str, Any]]:
        """Parses LRC format timestamps into millisecond-timed lines."""
        return parse_lrc_lines(text)

    def get_lyrics(self, video_id: str) -> Dict[str, Any]:
        cache_key = f"lyrics_v5_unicode_{video_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            title = ""
            artist = ""
            media_dur = None
            album = ""

            # Attempt 1: Fetch song details via client.get_song
            try:
                song_raw = self.client.get_song(video_id)
                if song_raw and isinstance(song_raw, dict):
                    video_details = song_raw.get("videoDetails", {})
                    title = video_details.get("title") or ""
                    artist = video_details.get("author") or ""
                    len_sec = int(video_details.get("lengthSeconds") or 0)
                    if len_sec > 0:
                        media_dur = float(len_sec)
            except Exception as e:
                logger.debug("get_song error for %s: %s", video_id, e)

            # Attempt 2: If title or artist missing, fetch watch playlist
            if not title or not artist:
                try:
                    watch_data = self.client.get_watch_playlist(videoId=video_id)
                    tracks = watch_data.get("tracks") or []
                    if tracks and isinstance(tracks[0], dict):
                        t0 = tracks[0]
                        title = title or t0.get("title") or ""
                        if not artist:
                            art_list = t0.get("artists") or []
                            if art_list and isinstance(art_list, list):
                                artist = art_list[0].get("name") if isinstance(art_list[0], dict) else str(art_list[0])
                        dur_str = t0.get("length")
                        if not media_dur and dur_str and ":" in dur_str:
                            parts = [int(p) for p in dur_str.split(":")]
                            if len(parts) == 2:
                                media_dur = float(parts[0] * 60 + parts[1])
                            elif len(parts) == 3:
                                media_dur = float(parts[0] * 3600 + parts[1] * 60 + parts[2])
                except Exception as e:
                    logger.debug("get_watch_playlist metadata error for %s: %s", video_id, e)

            track_info = {
                "videoId": video_id,
                "title": title,
                "artist": artist,
                "album": album,
                "duration": media_dur,
                "client": self.client,
            }

            result = self.lyrics_engine.get_lyrics(track_info)
            ttl = 86400 if result.get("hasLyrics") else 300
            cache_service.set(cache_key, result, ttl=ttl)
            return result
        except Exception as e:
            logger.warning("Lyrics lookup failed for %s: %s", video_id, e)
            empty_res = {
                "videoId": video_id,
                "synced": False,
                "hasLyrics": False,
                "lines": [],
                "lyrics": None,
                "source": None,
                "provider": None,
                "syncConfidence": None,
                "lyricsDuration": None,
                "mediaDuration": None,
                "durationDifference": None,
                "primaryScript": "latin",
                "direction": "ltr",
                "language": "unknown",
                "instrumental": False,
            }
            return empty_res

    def get_charts(self, country: str = "ZZ") -> Dict[str, Any]:
        cache_key = f"charts_{country}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_charts(country=country)
            
            top_videos = []
            for v in raw.get("videos", {}).get("items", []):
                top_videos.append(self._normalize_track(v))

            top_artists = []
            for a in raw.get("artists", {}).get("items", []):
                top_artists.append({
                    "channelId": a.get("browseId", ""),
                    "name": a.get("title", ""),
                    "subscribers": a.get("subscribers"),
                    "rank": a.get("rank"),
                    "thumbnails": self._extract_thumbnails(a),
                    "thumbnail": self._best_thumbnail(a),
                })

            result = {
                "country": country,
                "videos": top_videos,
                "artists": top_artists,
            }
            cache_service.set(cache_key, result, ttl=3600)
            return result
        except Exception as e:
            logger.error("Error fetching charts: %s", e)
            return {"country": country, "videos": [], "artists": []}

    def get_mood_categories(self) -> Dict[str, Any]:
        cache_key = "mood_categories"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_mood_categories()
            cache_service.set(cache_key, raw, ttl=86400)
            return raw
        except Exception as e:
            logger.error("Error fetching mood categories: %s", e)
            return {}

    def get_mood_playlists(self, params: str) -> List[Dict[str, Any]]:
        cache_key = f"mood_playlists_{params}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            raw = self.client.get_mood_playlists(params)
            playlists = []
            for p in raw:
                playlists.append({
                    "id": p.get("playlistId", ""),
                    "title": p.get("title", ""),
                    "description": p.get("description", ""),
                    "author": p.get("author", ""),
                    "thumbnails": self._extract_thumbnails(p),
                    "thumbnail": self._best_thumbnail(p),
                })
            cache_service.set(cache_key, playlists, ttl=7200)
            return playlists
        except Exception as e:
            logger.error("Error fetching mood playlists: %s", e)
            return []


ytmusic_service = YTMusicService()
