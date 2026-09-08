/**
 * AAPESH - Dynamic Artwork Color Extractor
 * Extracts dominant atmospheric color tones from album artwork using canvas,
 * with fallback to a deterministic harmonic palette when CORS prevents image data readback.
 */

export interface ArtworkPalette {
  primary: string;       // Accent color for controls/highlights (e.g. #6366f1)
  glow: string;          // Low-opacity radial glow color (e.g. rgba(99, 102, 241, 0.18))
  surface: string;       // Subtle surface tint (e.g. rgba(30, 35, 50, 0.7))
  gradient: string;      // CSS radial gradient string for ambient backdrop
}

const DEFAULT_PALETTE: ArtworkPalette = {
  primary: '#f8fafc',
  glow: 'rgba(255, 255, 255, 0.12)',
  surface: 'rgba(18, 20, 26, 0.75)',
  gradient: 'radial-gradient(circle at 50% 25%, rgba(255, 255, 255, 0.10) 0%, rgba(5, 5, 5, 0.98) 80%)',
};

// Tasteful, organic harmonic palettes derived from string hashing (NO neon purple/fuchsia)
const HARMONIC_PRESETS: Array<{ primary: string; rgb: [number, number, number] }> = [
  { primary: '#f59e0b', rgb: [245, 158, 11] }, // Warm Amber
  { primary: '#3b82f6', rgb: [59, 130, 246] }, // Slate Blue
  { primary: '#10b981', rgb: [16, 185, 129] }, // Deep Emerald
  { primary: '#e2e8f0', rgb: [226, 232, 240] }, // Soft Platinum
  { primary: '#0ea5e9', rgb: [14, 165, 233] }, // Ocean Blue
  { primary: '#d97706', rgb: [217, 119, 6] },  // Burnt Gold
  { primary: '#64748b', rgb: [100, 116, 139] }, // Cool Slate
  { primary: '#14b8a6', rgb: [20, 184, 166] }, // Subtle Teal
];

function getHashPalette(seed: string): ArtworkPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % HARMONIC_PRESETS.length;
  const preset = HARMONIC_PRESETS[index];
  const [r, g, b] = preset.rgb;

  return {
    primary: preset.primary,
    glow: `rgba(${r}, ${g}, ${b}, 0.18)`,
    surface: `rgba(${Math.round(r * 0.12 + 12)}, ${Math.round(g * 0.12 + 14)}, ${Math.round(b * 0.12 + 18)}, 0.75)`,
    gradient: `radial-gradient(circle at 50% 25%, rgba(${r}, ${g}, ${b}, 0.16) 0%, rgba(5, 5, 5, 0.98) 80%)`,
  };
}

const paletteCache = new Map<string, ArtworkPalette>();

export async function extractArtworkPalette(
  imageUrl?: string,
  fallbackSeed?: string
): Promise<ArtworkPalette> {
  const seed = fallbackSeed || imageUrl || 'aapesh';
  if (!imageUrl) {
    return getHashPalette(seed);
  }

  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    // If running in non-browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const palette = getHashPalette(seed);
      resolve(palette);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      // Timeout fallback
      const palette = getHashPalette(seed);
      paletteCache.set(imageUrl, palette);
      resolve(palette);
    }, 1200);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const p = getHashPalette(seed);
          paletteCache.set(imageUrl, p);
          resolve(p);
          return;
        }

        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);

        const data = ctx.getImageData(0, 0, 16, 16).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Filter out near-black and near-white
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 30 && lum < 225) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }

        if (count === 0) {
          const p = getHashPalette(seed);
          paletteCache.set(imageUrl, p);
          resolve(p);
          return;
        }

        const avgR = Math.round(rSum / count);
        const avgG = Math.round(gSum / count);
        const avgB = Math.round(bSum / count);

        const palette: ArtworkPalette = {
          primary: `rgb(${avgR}, ${avgG}, ${avgB})`,
          glow: `rgba(${avgR}, ${avgG}, ${avgB}, 0.22)`,
          surface: `rgba(${Math.round(avgR * 0.12 + 10)}, ${Math.round(avgG * 0.12 + 12)}, ${Math.round(avgB * 0.12 + 18)}, 0.75)`,
          gradient: `radial-gradient(circle at 50% 25%, rgba(${avgR}, ${avgG}, ${avgB}, 0.22) 0%, rgba(7, 8, 11, 0.96) 80%)`,
        };

        paletteCache.set(imageUrl, palette);
        resolve(palette);
      } catch {
        // CORS error fallback
        const p = getHashPalette(seed);
        paletteCache.set(imageUrl, p);
        resolve(p);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      const p = getHashPalette(seed);
      paletteCache.set(imageUrl, p);
      resolve(p);
    };

    img.src = imageUrl;
  });
}
