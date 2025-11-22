
import React from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

// Generic Defaults
const defaultSize = 24;
const defaultStroke = 2;
const defaultColor = "currentColor";

// Interface / Appearance Icon (Layout Panels)
export const IconInterface: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="3" x2="21" y1="9" y2="9" />
    <line x1="9" x2="9" y1="21" y2="9" />
  </svg>
);

// Model / Brain Icon (Robot Face)
export const IconModel: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="10" x="3" y="11" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" x2="8" y1="16" y2="16" />
    <line x1="16" x2="16" y1="16" y2="16" />
  </svg>
);

// API Key Icon (Key)
export const IconApiKey: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

// Data Management Icon (Database Stack)
export const IconData: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

// About Icon (Info Circle)
export const IconAbout: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

// New Chat Icon
export const IconNewChat: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

// Sidebar Toggle Icon (Redesigned: One long, one short line)
export const IconSidebarToggle: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" x2="20" y1="8" y2="8" />
    <line x1="4" x2="14" y1="16" y2="16" />
  </svg>
);

// Theme System Icon
export const IconThemeSystem: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="3" ry="3" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// Theme Dark Icon
export const IconThemeDark: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

// Theme Light Icon
export const IconThemeLight: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M6.34 17.66l-1.41 1.41" />
    <path d="M19.07 4.93l-1.41 1.41" />
  </svg>
);

// --- New Icons Redrawn from Image ---

// Robot Head (Bot)
export const IconDrawBot: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <line x1="12" y1="2" x2="12" y2="8" />
    <line x1="9" y1="12" x2="9" y2="14" />
    <line x1="15" y1="12" x2="15" y2="14" />
    <line x1="2" y1="14" x2="4" y2="14" />
    <line x1="20" y1="14" x2="22" y2="14" />
  </svg>
);

// Refresh (Circular Arrow)
export const IconDrawRefresh: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

// Clipboard Import (Clipboard with Arrow Left)
export const IconDrawImport: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M15 13H9m3-3-3 3 3 3" />
  </svg>
);

// Speaker (Sound)
export const IconDrawSpeaker: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

// Image (Landscape)
export const IconDrawImage: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// File Code (File with Brackets)
export const IconDrawFileCode: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m10 13-2 2 2 2" />
    <path d="m14 17 2-2-2-2" />
  </svg>
);

// Trash (Delete)
export const IconDrawTrash: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
