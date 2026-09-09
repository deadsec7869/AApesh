import React, { useState, useEffect, useRef } from 'react';
import { Music } from 'lucide-react';
import { getArtworkUrl } from '@/utils/artwork';

export interface ArtworkImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  item?: unknown;
  alt: string;
  fallbackIconClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  item,
  alt,
  className = '',
  fallbackIconClassName = 'w-5 h-5 text-neutral-500',
  fallbackIcon,
  loading,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const resolvedSrc = getArtworkUrl(item) ?? getArtworkUrl(src);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    // If image is already cached and loaded by the browser
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [resolvedSrc]);

  // Fallback state: ONLY when genuinely no URL exists or image errored
  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#181b24] to-[#0c0e14] border border-white/[0.06] ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackIcon || <Music className={fallbackIconClassName} />}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#12141c] ${className}`}>
      {/* Loading Skeleton: subtle neutral shimmer that never masks valid URL with an icon */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-white/[0.03] animate-pulse"
          aria-hidden="true"
        />
      )}
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        loading={loading ?? 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};
