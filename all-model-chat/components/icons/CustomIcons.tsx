
import React from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

// 通用默认值
const defaultSize = 24;
const defaultStroke = 1.5;
const defaultColor = "currentColor";

export const IconInterface: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="14" rx="3" ry="3" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 7h.01" />
  </svg>
);

export const IconModel: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L2.5 7.5L12 13L21.5 7.5L12 2Z" />
    <path d="M2.5 12L12 17.5L21.5 12" />
    <path d="M2.5 16.5L12 22L21.5 16.5" />
  </svg>
);

export const IconApiKey: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="8" cy="15" r="5" />
    <path d="M12.5 11.5L21 3" />
    <path d="M16 8L18 6" />
    <path d="M19 11L21 9" />
  </svg>
);

export const IconData: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 7c0 1.66-4 3-9 3S3 8.66 3 7" />
    <path d="M21 7c0-1.66-4-3-9-3S3 5.34 3 7" />
    <path d="M3 7v10c0 1.66 4 3 9 3s9-1.34 9-3V7" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

export const IconAbout: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
    <path d="M10 16h4" /> 
  </svg>
);

export const IconNewChat: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);
