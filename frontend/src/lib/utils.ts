import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Thumbnail } from '@/types/music';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatCompactNumber(numStrOrNum: string | number | undefined | null): string {
  if (!numStrOrNum) return '';
  if (typeof numStrOrNum === 'string') {
    // If it already has K/M/B like "120M", return directly
    if (/[KMB]/i.test(numStrOrNum)) return numStrOrNum;
    const parsed = parseInt(numStrOrNum.replace(/,/g, ''), 10);
    if (isNaN(parsed)) return numStrOrNum;
    numStrOrNum = parsed;
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(numStrOrNum);
}

export function getBestThumbnail(
  thumbnails?: Thumbnail[],
  fallbackUrl?: string,
  preferredWidth = 300
): string {
  if (!thumbnails || thumbnails.length === 0) {
    return fallbackUrl || '';
  }

  // Find thumbnail closest to preferred width or highest resolution
  let closest = thumbnails[0];
  let minDiff = Math.abs((closest.width || 0) - preferredWidth);

  for (const t of thumbnails) {
    if (t.width) {
      const diff = Math.abs(t.width - preferredWidth);
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    }
  }

  return closest.url || fallbackUrl || thumbnails[thumbnails.length - 1].url || '';
}

export { getArtworkUrl, getHighResArtworkUrl, getThumbnailArtworkUrl } from '@/utils/artwork';
