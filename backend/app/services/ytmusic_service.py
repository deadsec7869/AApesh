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
        raw = item.get("thumbnails") or []
        if not raw and "thumbnail" in item:
            thumb = item.get("thumbnail")
            if isinstance(thumb, str):
                return [{"url": thumb}]
            elif isinstance(thumb, list):
                raw = thumb
        results = []
        for t in raw:
            if isinstance(t, dict) and t.get("url"):
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

    def _normalize_author(self, raw_author: Any) -> str:
        if not raw_author:
            return ""
        if isinstance(raw_author, str):
            return raw_author
        if isinstance(raw_author, list):
            names = []
            for a in raw_author:
                if isinstance(a, dict):
                    n = a.get("name")
                    if n:
                        names.append(str(n))
                elif isinstance(a, str):
                    names.append(a)
            return ", ".join(names)
        if isinstance(raw_author, dict):
            return str(raw_author.get("name") or "")
        return str(raw_author)

    def _normalize_item_count(self, raw_count: Any) -> Optional[int]:
        if raw_count is None:
            return None
        if isinstance(raw_count, int):
            return raw_count
        if isinstance(raw_count, str):
            m = re.search(r'\d+', raw_count.replace(',', ''))
            if m:
                try:
                    return int(m.group(0))
                except ValueError:
                    return None
        return None

    def _normalize_artists(self, raw_artists: Any) -> List[Dict[str, Any]]:
        if not raw_artists:
            return []
        if isinstance(raw_artists, list):
            artists = []
            for a in raw_artists:
                if isinstance(a, dict):
                    name = str(a.get("name") or "Unknown Artist")
                    artists.append({"id": a.get("id"), "name": name})
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
                content_type = (c.get("type") or "").lower()
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
                elif "album" in content_type or ((c.get("browseId") or "").startswith("MPRE")):
                    inferred_type = "album"
                elif "artist" in content_type or ((c.get("browseId") or "").startswith("UC")):
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
        clean_query = query.strip() if query else ""
        if not clean_query:
            return {
                "query": query,
                "topResult": None,
                "songs": [],
                "albums": [],
                "artists": [],
                "playlists": [],
                "videos": [],
            }

        # Validate filter type against supported ytmusicapi filters
        allowed_filters = {"songs", "albums", "artists", "playlists", "videos"}
        effective_filter = filter_type.lower().strip() if filter_type else None
        if effective_filter not in allowed_filters:
            effective_filter = None

        cache_key = f"search_{clean_query}_{effective_filter}_{limit}"
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
            if effective_filter:
                raw_results = self.client.search(clean_query, filter=effective_filter, limit=limit)
            else:
                raw_results = self.client.search(clean_query, limit=limit)
        except Exception as e:
            logger.error("Error executing search for %r: %s", clean_query, e)
            raise e

        top_result_candidate = None

        for item in raw_results:
            try:
                result_type = (item.get("resultType") or item.get("type") or item.get("category") or "").lower()
                is_provider_top = (item.get("category") or "").lower() == "top result"

                if "song" in result_type:
                    norm_song = self._normalize_track(item)
                    results["songs"].append(norm_song)
                    if is_provider_top and not top_result_candidate:
                        top_result_candidate = {"type": "song", "data": norm_song}
                elif "album" in result_type:
                    norm_album = {
                        "browseId": item.get("browseId") or "",
                        "title": str(item.get("title") or "Unknown Album"),
                        "type": item.get("type", "Album"),
                        "year": str(item.get("year")) if item.get("year") is not None else None,
                        "artists": self._normalize_artists(item.get("artists")),
                        "thumbnails": self._extract_thumbnails(item),
                        "thumbnail": self._best_thumbnail(item),
                        "trackCount": self._normalize_item_count(item.get("trackCount")),
                    }
                    results["albums"].append(norm_album)
                    if is_provider_top and not top_result_candidate:
                        top_result_candidate = {"type": "album", "data": norm_album}
                elif "artist" in result_type:
                    channel_id = item.get("browseId") or item.get("channelId") or ""
                    artist_name = item.get("artist") or item.get("title") or ""
                    if not artist_name and item.get("artists"):
                        first_artist = item["artists"][0]
                        if isinstance(first_artist, dict):
                            artist_name = first_artist.get("name", "")
                            if not channel_id:
                                channel_id = first_artist.get("id") or ""
                        elif isinstance(first_artist, str):
                            artist_name = first_artist
                    if not artist_name:
                        artist_name = "Unknown Artist"

                    norm_artist = {
                        "channelId": channel_id,
                        "name": artist_name,
                        "subscribers": str(item.get("subscribers")) if item.get("subscribers") else None,
                        "thumbnails": self._extract_thumbnails(item),
                        "thumbnail": self._best_thumbnail(item),
                    }
                    results["artists"].append(norm_artist)
                    if is_provider_top and not top_result_candidate:
                        top_result_candidate = {"type": "artist", "data": norm_artist}
                elif "playlist" in result_type:
                    norm_playlist = {
                        "id": item.get("browseId") or item.get("id") or item.get("playlistId") or "",
                        "title": str(item.get("title") or "Untitled Playlist"),
                        "description": str(item.get("description") or ""),
                        "author": self._normalize_author(item.get("author")),
                        "itemCount": self._normalize_item_count(item.get("itemCount")) or 0,
                        "thumbnails": self._extract_thumbnails(item),
                        "thumbnail": self._best_thumbnail(item),
                    }
                    results["playlists"].append(norm_playlist)
                    if is_provider_top and not top_result_candidate:
                        top_result_candidate = {"type": "playlist", "data": norm_playlist}
                elif "video" in result_type:
                    norm_video = self._normalize_track(item)
                    results["videos"].append(norm_video)
                    if is_provider_top and not top_result_candidate:
                        top_result_candidate = {"type": "song", "data": norm_video}
            except Exception as item_err:
                logger.warning("Error normalizing search item: %s, raw item: %s", item_err, item)
                continue

        # Establish topResult: provider top result candidate, or fallback to first song/artist/album
        if top_result_candidate:
            results["topResult"] = top_result_candidate
        elif results["songs"]:
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

            videos = []
            for v in raw.get("videos", {}).get("results", []):
                videos.append(self._normalize_track(v))

            related = []
            for r in raw.get("related", {}).get("results", []):
                related.append({
                    "id": r.get("browseId"),
                    "name": r.get("title", ""),
                    "thumbnails": self._extract_thumbnails(r),
                    "thumbnail": self._best_thumbnail(r),
                    "subscribers": r.get("subscribers"),
                })

            featured_release = None
            if albums and len(albums) > 0:
                featured_release = albums[0]
            elif singles and len(singles) > 0:
                featured_release = singles[0]

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
                "videos": videos,
                "featuredRelease": featured_release,
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
            
            def chart_items(section):
                return section.get("items", []) if isinstance(section, dict) else section or []

            videos = chart_items(raw.get("videos"))
            top_videos = [self._normalize_track(v) for v in videos if v.get("videoId")]
            if not top_videos:
                # Some regions expose the chart as a playlist instead of inline tracks.
                playlist_id = next((v["playlistId"] for v in videos if v.get("playlistId")), None)
                if playlist_id:
                    top_videos = self.get_playlist(playlist_id).get("tracks", [])[:50]

            top_artists = []
            for a in chart_items(raw.get("artists")):
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

    def get_song_context(self, video_id: str) -> Dict[str, Any]:
        """
        Retrieves authentic music context, credits, artist background, album details,
        and related tracks for About This Song 2.0 without data fabrication.
        """
        cache_key = f"song-context:{video_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        # 1. Base track details
        try:
            base_track = self.get_song(video_id)
        except Exception as e:
            logger.debug("Error fetching base song for context %s: %s", video_id, e)
            base_track = {}

        title = base_track.get("title") or "Unknown Title"
        artists = base_track.get("artists") or []
        primary_artist_name = artists[0]["name"] if artists else ""
        primary_artist_id = artists[0].get("id") if artists else None
        album_name = base_track.get("album")
        album_id = base_track.get("albumId")
        duration = base_track.get("duration") or "0:00"
        duration_seconds = base_track.get("duration_seconds") or 0
        thumbnails = base_track.get("thumbnails") or []
        thumbnail = base_track.get("thumbnail") or ""
        is_explicit = base_track.get("isExplicit", False)

        year: Optional[str] = None
        release_date: Optional[str] = None
        genre: Optional[str] = None
        album_type: Optional[str] = None
        language: Optional[str] = None

        artist_details: Optional[Dict[str, Any]] = {
            "id": primary_artist_id,
            "name": primary_artist_name or "Unknown Artist",
            "subscribers": None,
            "thumbnail": None,
            "description": None,
        }

        album_details: Optional[Dict[str, Any]] = None
        credits_data: Optional[Dict[str, Any]] = None
        from_album_tracks: List[Dict[str, Any]] = []
        more_artist_tracks: List[Dict[str, Any]] = []
        you_might_like_tracks: List[Dict[str, Any]] = []

        lyrics_info: Dict[str, Any] = {
            "hasLyrics": False,
            "synced": False,
            "provider": None,
            "language": None,
        }

        credits_browse_id: Optional[str] = None

        # 2. Watch playlist & related recommendations
        try:
            watch_data = self.client.get_watch_playlist(videoId=video_id)
            if watch_data:
                watch_tracks = watch_data.get("tracks", [])
                if watch_tracks and isinstance(watch_tracks[0], dict):
                    t0 = watch_tracks[0]
                    if not title or title == "Song":
                        title = t0.get("title") or title
                    if not artists or (len(artists) == 1 and artists[0]["name"] == "Artist"):
                        artists = self._normalize_artists(t0.get("artists"))
                        if artists:
                            primary_artist_name = artists[0]["name"]
                            primary_artist_id = artists[0].get("id")
                            artist_details["id"] = primary_artist_id
                            artist_details["name"] = primary_artist_name
                    if not thumbnail and t0.get("thumbnail"):
                        thumbnails = self._extract_thumbnails(t0)
                        thumbnail = self._best_thumbnail(t0)
                    if t0.get("length") and duration == "0:00":
                        duration = t0.get("length")
                    if t0.get("isExplicit"):
                        is_explicit = True

                if watch_data.get("lyrics"):
                    lyrics_info["hasLyrics"] = True

                rel_browse_id = watch_data.get("related")
                if rel_browse_id:
                    try:
                        rel_sections = self.client.get_song_related(rel_browse_id)
                        for sec in rel_sections:
                            if not isinstance(sec, dict):
                                continue
                            sec_title = (sec.get("title") or "").lower()
                            contents = sec.get("contents")

                            if "about the artist" in sec_title and isinstance(contents, str):
                                artist_details["description"] = contents.strip()
                            elif ("you might also like" in sec_title or "similar" in sec_title) and isinstance(contents, list):
                                for item in contents[:10]:
                                    if isinstance(item, dict) and item.get("videoId") != video_id:
                                        you_might_like_tracks.append(self._normalize_track(item))
                            elif primary_artist_name and primary_artist_name.lower() in sec_title and isinstance(contents, list):
                                for item in contents[:10]:
                                    if isinstance(item, dict) and item.get("videoId") != video_id:
                                        more_artist_tracks.append(self._normalize_track(item))
                            elif "from the album" in sec_title and isinstance(contents, list):
                                for item in contents:
                                    if isinstance(item, dict) and item.get("videoId") != video_id:
                                        from_album_tracks.append(self._normalize_track(item))
                    except Exception as e:
                        logger.debug("Error retrieving related song data for %s: %s", video_id, e)
        except Exception as e:
            logger.debug("Error fetching watch playlist in context for %s: %s", video_id, e)

        # 3. Discover Album & Credits Browse ID
        try:
            target_album_id = album_id
            if not target_album_id and title and primary_artist_name:
                search_query = f"{title} {primary_artist_name}"
                album_search = self.client.search(search_query, filter="albums", limit=3)
                if album_search and isinstance(album_search, list):
                    target_album_id = album_search[0].get("browseId")

            if target_album_id:
                album_raw = self.client.get_album(target_album_id)
                if album_raw and not album_raw.get("error"):
                    album_details = {
                        "browseId": target_album_id,
                        "title": album_raw.get("title", "Unknown Album"),
                        "year": str(album_raw.get("year")) if album_raw.get("year") else None,
                        "trackCount": album_raw.get("trackCount") or len(album_raw.get("tracks", [])),
                        "thumbnail": self._best_thumbnail(album_raw),
                        "artists": self._normalize_artists(album_raw.get("artists")),
                    }
                    if not album_name:
                        album_name = album_details["title"]
                    if not album_id:
                        album_id = target_album_id
                    if album_raw.get("year"):
                        year = str(album_raw.get("year"))
                    if album_raw.get("type"):
                        album_type = album_raw.get("type")

                    # Scan album tracks for creditsBrowseId and populate fromAlbum
                    album_tracks = album_raw.get("tracks", [])
                    for trk in album_tracks:
                        trk_norm = self._normalize_track(trk)
                        if trk.get("videoId") != video_id and not any(t["videoId"] == trk_norm["videoId"] for t in from_album_tracks):
                            from_album_tracks.append(trk_norm)

                        if trk.get("videoId") == video_id or (title.lower() in trk.get("title", "").lower()):
                            if trk.get("creditsBrowseId"):
                                credits_browse_id = trk.get("creditsBrowseId")
        except Exception as e:
            logger.debug("Error resolving album/credits for %s: %s", video_id, e)

        # 4. Fetch Real Song Credits if credits_browse_id is available
        if credits_browse_id and credits_browse_id.startswith("MPTC"):
            try:
                raw_credits = self.client.get_song_credits(credits_browse_id)
                if raw_credits and isinstance(raw_credits, dict):
                    other_secs = []
                    for other in raw_credits.get("other_sections", []):
                        if isinstance(other, dict) and other.get("localized_title") and other.get("data"):
                            other_secs.append({
                                "localized_title": other.get("localized_title"),
                                "data": [str(d) for d in other.get("data", [])],
                            })

                    def extract_sec(key: str) -> Optional[Dict[str, Any]]:
                        sec = raw_credits.get(key)
                        if sec and isinstance(sec, dict) and sec.get("data"):
                            return {
                                "localized_title": sec.get("localized_title") or key.replace("_", " ").title(),
                                "data": [str(d) for d in sec.get("data", [])],
                            }
                        return None

                    credits_data = {
                        "performed_by": extract_sec("performed_by"),
                        "written_by": extract_sec("written_by"),
                        "produced_by": extract_sec("produced_by"),
                        "composed_by": extract_sec("composed_by"),
                        "music_metadata_provided_by": extract_sec("music_metadata_provided_by"),
                        "other_sections": other_secs,
                    }
            except Exception as e:
                logger.debug("Error fetching credits for %s: %s", credits_browse_id, e)

        # 5. Enrich Artist Details if missing bio/thumbnail and artist id exists
        if primary_artist_id and (not artist_details.get("description") or not artist_details.get("thumbnail")):
            try:
                artist_raw = self.client.get_artist(primary_artist_id)
                if artist_raw and not artist_raw.get("error"):
                    if not artist_details.get("description") and artist_raw.get("description"):
                        artist_details["description"] = artist_raw.get("description")
                    if not artist_details.get("thumbnail") and artist_raw.get("thumbnails"):
                        artist_details["thumbnail"] = self._best_thumbnail(artist_raw)
                    if not artist_details.get("subscribers") and artist_raw.get("subscribers"):
                        artist_details["subscribers"] = artist_raw.get("subscribers")
            except Exception as e:
                logger.debug("Error fetching artist details for %s: %s", primary_artist_id, e)

        # 6. Check Lyrics status from cache if exists
        lyrics_cached = cache_service.get(f"lyrics_v5_unicode_{video_id}")
        if lyrics_cached:
            lyrics_info["hasLyrics"] = bool(lyrics_cached.get("hasLyrics"))
            lyrics_info["synced"] = bool(lyrics_cached.get("synced"))
            lyrics_info["provider"] = lyrics_cached.get("provider")
            lyrics_info["language"] = lyrics_cached.get("language")

        result = {
            "videoId": video_id,
            "title": title,
            "artists": artists,
            "album": album_name,
            "albumId": album_id,
            "duration": duration,
            "duration_seconds": duration_seconds,
            "thumbnails": thumbnails,
            "thumbnail": thumbnail,
            "isExplicit": is_explicit,
            "year": year,
            "releaseDate": release_date or year,
            "genre": genre,
            "albumType": album_type,
            "language": language,
            "artistDetails": artist_details if (artist_details.get("name") and artist_details.get("name") != "Unknown Artist") else None,
            "albumDetails": album_details,
            "credits": credits_data,
            "related": {
                "fromAlbum": from_album_tracks[:12],
                "moreFromArtist": more_artist_tracks[:12],
                "youMightLike": you_might_like_tracks[:12],
            },
            "lyricsInfo": lyrics_info,
            "dataSource": "YouTube Music",
        }

        cache_service.set(cache_key, result, ttl=3600)  # 1 hour
        return result


ytmusic_service = YTMusicService()

