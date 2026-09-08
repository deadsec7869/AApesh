import '@testing-library/jest-dom';

// Mock localStorage for Node 26 environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
  key: (i: number) => Object.keys(storage)[i] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock mediaSession
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'mediaSession', {
    writable: true,
    value: {
      metadata: null,
      playbackState: 'none',
      setActionHandler: () => {},
    },
  });
}

// Mock Canvas 2D context for WebGL texture helpers in jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
        drawImage: () => {},
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
      } as any;
    }
    return null;
  };
}

