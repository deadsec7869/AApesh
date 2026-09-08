import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="flex flex-col gap-3 p-3 rounded-xl glass-surface animate-pulse">
    <div className="w-full aspect-square bg-white/5 rounded-lg shimmer" />
    <div className="h-4 w-3/4 bg-white/10 rounded shimmer" />
    <div className="h-3 w-1/2 bg-white/5 rounded shimmer" />
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-white/[0.02] animate-pulse">
        <div className="w-6 h-4 bg-white/5 rounded shimmer" />
        <div className="w-12 h-12 bg-white/10 rounded-md shimmer shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 w-1/3 bg-white/10 rounded shimmer" />
          <div className="h-3 w-1/4 bg-white/5 rounded shimmer" />
        </div>
        <div className="w-20 h-4 bg-white/5 rounded shimmer hidden md:block" />
        <div className="w-10 h-4 bg-white/5 rounded shimmer" />
      </div>
    ))}
  </div>
);

export const SkeletonHero: React.FC = () => (
  <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-8 rounded-2xl bg-white/[0.03] animate-pulse">
    <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl bg-white/10 shimmer shrink-0" />
    <div className="flex-1 flex flex-col gap-4 w-full">
      <div className="h-4 w-20 bg-white/10 rounded shimmer" />
      <div className="h-10 w-2/3 bg-white/10 rounded shimmer" />
      <div className="h-4 w-1/2 bg-white/5 rounded shimmer" />
      <div className="flex gap-3 pt-2">
        <div className="h-11 w-28 bg-white/15 rounded-full shimmer" />
        <div className="h-11 w-11 bg-white/10 rounded-full shimmer" />
      </div>
    </div>
  </div>
);
