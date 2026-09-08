import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-3xl bg-white/10 text-white flex items-center justify-center mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-white mb-2">Page Not Found</h1>
      <p className="text-sm text-neutral-400 max-w-sm mb-6">
        The destination you are looking for has faded into the atmospheric space.
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium text-sm transition-all duration-200 ease-out-expo shadow-play-btn"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </button>
    </div>
  );
};
