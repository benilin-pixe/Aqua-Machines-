import React, { useState } from 'react';
import { Droplets, Server, ShieldCheck, Activity } from 'lucide-react';

interface MachineImageProps {
  src: string;
  alt: string;
  name: string;
  category?: string;
  model?: string;
  className?: string;
}

export const MachineImage: React.FC<MachineImageProps> = ({
  src,
  alt,
  name,
  category,
  model,
  className = "w-full h-full object-cover",
}) => {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If the image fails to load (e.g. offline, 404, or invalid path),
  // render a distinctive dark navy high-tech equipment fallback graphic
  if (hasError || !src) {
    return (
      <div className="w-full h-full min-h-[192px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden border border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.15),transparent_70%)]" />
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10 relative z-10">
          <Droplets className="w-8 h-8 animate-pulse text-cyan-400" />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="text-xs font-bold text-white tracking-wide">{name}</div>
          <div className="text-[10px] font-mono text-cyan-300">
            {model || 'Aqua Verified Unit'}
          </div>
          <div className="inline-flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-widest pt-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Industrial RO Purification</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {!loaded && (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center animate-pulse">
          <Server className="w-6 h-6 text-slate-700" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-90' : 'opacity-0'}`}
      />
    </div>
  );
};
