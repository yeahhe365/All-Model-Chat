import React from 'react';
import { IconProps, StrokeIcon } from '../iconUtils';

// API Key Icon (Key)
export const IconApiKey: React.FC<IconProps> = (props) => (
  <StrokeIcon {...props}>
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </StrokeIcon>
);

// Data Management Icon (Database Stack)
export const IconData: React.FC<IconProps> = (props) => (
  <StrokeIcon {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </StrokeIcon>
);

// About Icon (Info Circle)
export const IconAbout: React.FC<IconProps> = (props) => (
  <StrokeIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </StrokeIcon>
);

// Shortcuts Icon (Keyboard)
export const IconKeyboard: React.FC<IconProps> = (props) => (
  <StrokeIcon {...props}>
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <path d="M6 10h2" />
    <path d="M10 10h2" />
    <path d="M14 10h2" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 14h.01" />
  </StrokeIcon>
);
