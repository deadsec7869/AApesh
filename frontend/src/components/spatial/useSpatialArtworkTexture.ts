import * as THREE from 'three';

// Memory-safe LRU Texture Cache
const textureCache = new Map<string, THREE.Texture>();
const MAX_CACHE_SIZE = 20;

// Create a fallback 1x1 neutral dark texture to prevent null errors
function createFallbackTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, 4, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const fallbackTexture = createFallbackTexture();

/**
 * Loads a Three.js texture with CORS support and caching.
 */
export function loadSpatialTexture(url?: string): Promise<THREE.Texture> {
  if (!url) {
    return Promise.resolve(fallbackTexture);
  }

  if (textureCache.has(url)) {
    return Promise.resolve(textureCache.get(url)!);
  }

  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(
      url,
      (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Manage cache size
        if (textureCache.size >= MAX_CACHE_SIZE) {
          const firstKey = textureCache.keys().next().value;
          if (firstKey) {
            const oldTex = textureCache.get(firstKey);
            oldTex?.dispose();
            textureCache.delete(firstKey);
          }
        }

        textureCache.set(url, texture);
        resolve(texture);
      },
      undefined,
      () => {
        // Fallback on load error
        resolve(fallbackTexture);
      }
    );
  });
}

/**
 * Creates a soft radial particle texture via canvas for point motes
 */
export function createParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a soft floor shadow texture for the 3D artwork card
 */
export function createShadowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Clear texture cache and dispose all textures
 */
export function clearTextureCache(): void {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
}
