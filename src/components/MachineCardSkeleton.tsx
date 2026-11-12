import React from 'react';
import { Droplets } from 'lucide-react';

interface MachineCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader replicating the exact structure and dark navy/cyan visual theme
 * of the verified Aqua Machine product card.
 */
export const MachineCardSkeleton: React.FC<MachineCardSkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`rounded-3xl border border-slate-800/90 bg-slate-900/80 overflow-hidden flex flex-col justify-between shadow-2xl relative select-none animate-pulse ${className}`}
      aria-hidden="true"
    >
      {/* Top Half: Image & Body Information */}
      <div>
        {/* Machine Image Preview Skeleton */}
        <div className="relative h-48 bg-slate-950 overflow-hidden border-b border-slate-800/60 flex items-center justify-center">
          {/* Subtle animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950" />
          
          {/* Subtle water droplet icon placeholder */}
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-center text-cyan-500/20">
            <Droplets className="w-6 h-6 animate-pulse" />
          </div>

          {/* Top-Left Category Badge Skeleton */}
          <div className="absolute top-3 left-3 z-10">
            <div className="h-5 w-20 rounded-full bg-slate-900/90 border border-cyan-500/20 backdrop-blur-md" />
          </div>

          {/* Top-Right Model Tag Skeleton */}
          <div className="absolute top-3 right-3 z-10">
            <div className="h-5 w-16 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur-md" />
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 space-y-4">
          <div>
            {/* Manufacturer Tag */}
            <div className="h-2.5 w-32 rounded bg-slate-800/80 mb-2" />

            {/* Title & Price Header */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="h-6 w-36 rounded-lg bg-slate-800" />
              <div className="h-5 w-24 rounded-lg bg-cyan-950/60 border border-cyan-800/30" />
            </div>

            {/* Description Lines */}
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full rounded bg-slate-800/60" />
              <div className="h-3 w-4/5 rounded bg-slate-800/50" />
            </div>
          </div>

          {/* Technical Specifications & Telemetry Block */}
          <div className="space-y-2.5 py-3 border-y border-slate-800/80 text-xs font-mono">
            {/* Row 1: Water Capacity */}
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-800/60" />
              <div className="h-3 w-28 rounded bg-slate-800" />
            </div>

            {/* Row 2: Daily Return */}
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-slate-800/60" />
              <div className="h-3 w-24 rounded bg-cyan-950 border border-cyan-900/50" />
            </div>

            {/* Row 3: Est Monthly Return */}
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-slate-800/60" />
              <div className="h-3 w-24 rounded bg-emerald-950 border border-emerald-900/40" />
            </div>

            {/* Row 4: Stock Status */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
              <div className="h-3 w-20 rounded bg-slate-800/60" />
              <div className="h-3.5 w-24 rounded-md bg-emerald-950/50 border border-emerald-900/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons Skeleton */}
      <div className="p-6 pt-0 flex items-center gap-3">
        <div className="h-9 flex-1 rounded-xl bg-slate-800/80 border border-slate-700/50" />
        <div className="h-9 flex-1 rounded-xl bg-gradient-to-r from-cyan-950/70 to-slate-900 border border-cyan-500/20" />
      </div>
    </div>
  );
};

/**
 * Responsive grid container rendering multiple machine card skeletons
 */
export const MachineGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      role="status"
      aria-label="Loading water machines catalogue..."
    >
      {Array.from({ length: count }).map((_, idx) => (
        <MachineCardSkeleton key={idx} />
      ))}
    </div>
  );
};
