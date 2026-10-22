import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 36, showText = true }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Symbol: Bold letter A + water droplet + flowing waves + subtle gear cogs */}
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_8px_rgba(6,182,212,0.4)]"
        >
          <defs>
            <linearGradient id="navGearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>

            <linearGradient id="navLeftLeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            <linearGradient id="navRightLeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="navDroplet" x1="20%" y1="10%" x2="80%" y2="90%">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="navWave" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Subtle Gear Cogs (Mechanical/Industrial Water Systems) */}
          <g fill="url(#navGearGrad)" stroke="#082f49" strokeWidth="2">
            <path d="M 238,20 L 274,20 L 270,44 L 242,44 Z" />
            <path d="M 326,42 L 354,64 L 336,82 L 312,64 Z" />
            <path d="M 390,98 L 410,130 L 388,142 L 372,116 Z" />
            <path d="M 186,42 L 158,64 L 176,82 L 200,64 Z" />
            <path d="M 122,98 L 102,130 L 124,142 L 140,116 Z" />
            <path d="M 96,210 A 185,185 0 0,1 416,210 L 388,210 A 155,155 0 0,0 124,210 Z" opacity="0.8" />
          </g>

          {/* Navy Base Silhouette */}
          <path
            d="M 256,34 L 456,436 A 16,16 0 0,1 442,460 L 374,460 A 14,14 0 0,1 361,449 L 322,354 L 190,354 L 151,449 A 14,14 0 0,1 138,460 L 70,460 A 16,16 0 0,1 56,436 Z"
            fill="#081e36"
            stroke="#041226"
            strokeWidth="10"
            strokeLinejoin="round"
          />

          {/* Right Leg */}
          <path
            d="M 256,42 L 450,432 A 10,10 0 0,1 441,452 L 378,452 A 10,10 0 0,1 369,444 L 322,342 L 256,192 Z"
            fill="url(#navRightLeg)"
          />

          {/* Left Leg & Wave Flow */}
          <path
            d="M 256,42 L 62,432 A 10,10 0 0,0 71,452 L 134,452 A 10,10 0 0,0 143,444 L 190,342 C 214,310 240,280 256,192 C 260,110 258,54 256,42 Z"
            fill="url(#navLeftLeg)"
          />

          {/* Flowing Water Wave Crossbar */}
          <path
            d="M 160,346 C 195,310 230,305 256,326 C 285,348 318,348 352,346 L 336,380 C 305,378 275,372 254,352 C 230,328 198,332 176,378 Z"
            fill="url(#navWave)"
          />
          <path
            d="M 194,342 C 220,324 246,324 266,338 C 288,354 312,352 334,345"
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Central Water Droplet */}
          <path
            d="M 256,108 C 256,108 214,182 214,228 C 214,258 233,278 256,278 C 279,278 298,258 298,228 C 298,182 256,108 256,108 Z"
            fill="url(#navDroplet)"
            stroke="#042f4c"
            strokeWidth="3"
          />
          <path
            d="M 234,204 C 230,222 234,244 244,254 C 246,256 242,260 239,257 C 226,244 222,218 227,198 C 228,193 235,198 234,204 Z"
            fill="#ffffff"
            opacity="0.85"
          />
          <circle cx="256" cy="144" r="5" fill="#ffffff" opacity="0.9" />

          {/* Apex Gleam */}
          <circle cx="256" cy="40" r="4" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-wider font-extrabold text-base md:text-lg uppercase text-white leading-tight">
            <span>AQUA</span>
            <span className="text-cyan-400 ml-1.5">MACHINES</span>
          </div>
          <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase leading-none">
            Water Tech & Rewards
          </span>
        </div>
      )}
    </div>
  );
};
