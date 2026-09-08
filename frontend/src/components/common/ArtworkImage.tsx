import React, { useState } from 'react';
import { Music } from 'lucide-react';

interface ArtworkImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackIconClassName?: string;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIconClassName = 'w-5 h-5 text-neutral-500',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#181b24] to-[#0c0e14] border border-white/[0.06] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Music className={fallbackIconClassName} />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#12141c] ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03] animate-pulse">
          <Music className={fallbackIconClassName} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};
