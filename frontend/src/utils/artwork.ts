import { Thumbnail } from '@/types/music';

/**
 * Universal canonical artwork resolver for AAPESH.
 * Safely extracts the best artwork URL from any track, album, artist,
 * playlist, shelf item, or generic backend response dictionary.
 */
export function getArtworkUrl(
  item: unknown,
  preferredWidth: number = 500
): string | null {
  if (!item) return null;

  // If item is already a URL string
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof item !== 'object') return null;

  const obj = item as Record<string, any>;

  // 1. Check direct string fields across all schemas
  const stringCandidates = [
    obj.thumbnail,
    obj.thumbnail_url,
    obj.thumbnailUrl,
    obj.artworkUrl,
    obj.artwork_url,
    obj.cover,
    obj.coverUrl,
    obj.cover_url,
    obj.image,
    obj.imageUrl,
    obj.image_url,
  ];

  for (const c of stringCandidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }

  // 2. Check array fields: thumbnails, images, artwork
  const arrayCandidates = [
    obj.thumbnails,
    obj.images,
    obj.artwork,
  ];

  for (const arr of arrayCandidates) {
    if (Array.isArray(arr) && arr.length > 0) {
      const validThumbs: { url: string; width: number }[] = [];

      for (const t of arr) {
        if (typeof t === 'string' && t.trim().length > 0) {
          validThumbs.push({ url: t.trim(), width: 0 });
        } else if (t && typeof t === 'object') {
          const u = t.url || t.src || t.href;
          if (typeof u === 'string' && u.trim().length > 0) {
            validThumbs.push({ url: u.trim(), width: Number(t.width) || 0 });
          }
        }
      }

      if (validThumbs.length > 0) {
        // If preferred width specified and dimensions are present, find closest
        let best = validThumbs[0];
        let minDiff = Math.abs((best.width || 0) - preferredWidth);

        for (const t of validThumbs) {
          if (t.width > 0) {
            const diff = Math.abs(t.width - preferredWidth);
            if (diff < minDiff) {
              minDiff = diff;
              best = t;
            }
          }
        }

        // If items don't have widths or best is 0, prefer the last element (typically highest res)
        if (best.width === 0 && validThumbs.length > 1) {
          return validThumbs[validThumbs.length - 1].url;
        }

        return best.url || validThumbs[validThumbs.length - 1].url;
      }
    }
  }

  return null;
}

/**
 * Returns highest resolution artwork URL for full-viewport / ambient canvases.
 */
export function getHighResArtworkUrl(item: unknown): string | null {
  return getArtworkUrl(item, 1200);
}

/**
 * Returns compact artwork URL for small pills, avatars, and rows.
 */
export function getThumbnailArtworkUrl(item: unknown): string | null {
  return getArtworkUrl(item, 300);
}
