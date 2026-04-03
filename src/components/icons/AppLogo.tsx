
import React, { useId } from 'react';

export const AppLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  const idPrefix = useId();
  const gradientId = `techGradient-${idPrefix.replace(/:/g, '')}`;
  const maskId = `cut-lines-${idPrefix.replace(/:/g, '')}`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 18 195 75" className={className} style={style} aria-label="All Model Chat Logo">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00ffff', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#aa00ff', stopOpacity: 1 }} />
        </linearGradient>
        
        <mask id={maskId}>
          <rect x="-50" y="0" width="350" height="150" fill="white"/>
          <rect x="-50" y="45" width="350" height="4" fill="black"/>
          <rect x="-50" y="60" width="350" height="2" fill="black"/>
          <rect x="36" y="55" width="8" height="8" fill="black"/>
        </mask>
      </defs>

      <g transform="skewX(-15)">
        <g mask={`url(#${maskId})`} fill={`url(#${gradientId})`}>
            <path d="M20,80 L40,20 L60,80 L48,80 L44,68 L36,68 L32,80 Z" />
            <path d="M70,80 L70,20 L85,20 L95,50 L105,20 L120,20 L120,80 L110,80 L110,40 L98,70 L92,70 L80,40 L80,80 Z" />
            <path d="M165,25 L140,25 L135,40 L135,65 L140,80 L165,80 L165,70 L145,70 L145,35 L165,35 Z" />
        </g>
        <rect x="170" y="20" width="10" height="10" fill="#00ffff" />
        <rect x="10" y="85" width="20" height="3" fill="#00ffff" />
      </g>
    </svg>
  );
};
