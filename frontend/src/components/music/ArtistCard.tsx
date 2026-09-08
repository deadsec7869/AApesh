import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

interface ArtistCardProps {
  artist: {
    channelId: string;
    name: string;
    subscribers?: string;
    thumbnail?: string;
  };
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/artist/${artist.channelId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 ease-out-expo cursor-pointer hover:bg-white/[0.04] text-center"
    >
      <div className="relative aspect-square w-full max-w-[160px] rounded-full overflow-hidden bg-charcoal-800 shadow-artwork transition-shadow">
        {artist.thumbnail ? (
          <img
            src={artist.thumbnail}
            alt={artist.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-charcoal-700 text-neutral-500">
            <User className="w-12 h-12" />
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 w-full px-1">
        <h3 className="font-semibold text-sm text-neutral-100 truncate group-hover:text-white transition-colors">
          {artist.name}
        </h3>
        <span className="text-xs text-neutral-400 truncate mt-0.5">
          {artist.subscribers ? `${formatCompactNumber(artist.subscribers)} fans` : 'Artist'}
        </span>
      </div>
    </div>
  );
};
