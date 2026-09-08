import React from 'react';

export const SearchSkeleton: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-8 w-full max-w-6xl animate-pulse"
      aria-label="Loading search results"
      aria-busy="true"
    >
      {/* Top Result Skeleton */}
      <div className="flex flex-col gap-2.5 max-w-xl">
        <div className="h-3 w-20 bg-white/[0.06] rounded" />
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-white/[0.06] shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-3 w-12 bg-white/[0.08] rounded" />
            <div className="h-5 w-48 bg-white/[0.08] rounded" />
            <div className="h-3.5 w-32 bg-white/[0.05] rounded" />
          </div>
          <div className="w-12 h-12 rounded-full bg-white/[0.08] shrink-0" />
        </div>
      </div>

      {/* Songs Section Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-24 bg-white/[0.06] rounded" />
        <div className="flex flex-col gap-1 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-3 py-2.5 rounded-2xl bg-white/[0.01]"
            >
              <div className="w-7 h-7 bg-white/[0.04] rounded-full shrink-0" />
              <div className="w-11 h-11 bg-white/[0.06] rounded-xl shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="h-4 w-40 sm:w-64 bg-white/[0.07] rounded" />
                <div className="h-3 w-24 sm:w-40 bg-white/[0.04] rounded" />
              </div>
              <div className="hidden md:block w-1/4 h-3 bg-white/[0.04] rounded" />
              <div className="w-10 h-3 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Albums / Shelves Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-24 bg-white/[0.06] rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-2 rounded-xl bg-white/[0.02]">
              <div className="aspect-square w-full rounded-xl bg-white/[0.06]" />
              <div className="h-3.5 w-3/4 bg-white/[0.07] rounded mt-1" />
              <div className="h-3 w-1/2 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Artists Rail Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-24 bg-white/[0.06] rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-2 rounded-xl bg-white/[0.02]">
              <div className="aspect-square w-full max-w-[140px] rounded-full bg-white/[0.06]" />
              <div className="h-3.5 w-20 bg-white/[0.07] rounded mt-1" />
              <div className="h-3 w-14 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
