

import React from 'react';
import { IconProps, StrokeIcon, defaultSize, defaultStroke, defaultColor } from '../iconUtils';

// New Chat Icon
export const IconNewChat: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

// New Group Icon
export const IconNewGroup: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    data-testid="new-group-folder-icon"
  >
    <path d="M3 7.5C3 6.67 3.67 6 4.5 6H9l2 2h8.5c.83 0 1.5.67 1.5 1.5V12" />
    <path d="M3 7.5V18c0 .83.67 1.5 1.5 1.5h8" />
    <path d="M18 15v6M15 18h6" />
  </svg>
);

// Sidebar Toggle Icon
export const IconSidebarToggle: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" x2="20" y1="8" y2="8" />
    <line x1="4" x2="14" y1="16" y2="16" />
  </svg>
);

// History / Recent Chats Icon
export const IconHistory: React.FC<IconProps> = (props) => (
  <StrokeIcon {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </StrokeIcon>
);

// Stop Generation
export const IconStop: React.FC<IconProps> = ({ size = defaultSize, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="16" height="16" rx="2" fill={color} />
  </svg>
);

// Scenarios (Scroll style)
export const IconScenarios: React.FC<IconProps> = ({ size = defaultSize, strokeWidth = defaultStroke, className, color = defaultColor }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
    <path d="M19 17V5a2 2 0 0 0-2-2H4" />
  </svg>
);

// Google G Icon
export const IconGoogle: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </g>
  </svg>
);

// HTML5 Logo
export const IconHtml5: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill="#E34F26" d="M71,460 L30,0 481,0 440,460 255,512"/>
    <path fill="#EF652A" d="M256,472 L405,431 440,37 256,37"/>
    <path fill="#EBEBEB" d="M256,208 L181,208 176,150 256,150 256,94 255,94 114,94 115,109 129,265 256,265zM256,355 L255,355 192,338 188,293 132,293 139,382 256,414z"/>
    <path fill="#FFFFFF" d="M255,208 L255,265 325,265 318,338 255,355 255,414 371,382 372,372 385,223 387,208zM256,94 L256,129 256,150 256,150 389,150 390,150 391,150 392,150 393,150 396,109 397,94z"/>
  </svg>
);

// Python Icon
export const IconPython: React.FC<IconProps> = ({ size = defaultSize, className }) => {
  const gradientSeed = React.useId().replace(/:/g, '');
  const blueGradientId = `python-blue-${gradientSeed}`;
  const yellowGradientId = `python-yellow-${gradientSeed}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 140"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={blueGradientId} x1="24" y1="10" x2="84" y2="67" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5a9fd4" />
          <stop offset="1" stopColor="#306998" />
        </linearGradient>
        <linearGradient id={yellowGradientId} x1="86" y1="130" x2="26" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd43b" />
          <stop offset="1" stopColor="#ffe873" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${blueGradientId})`}
        d="M54.9188 0C50.3351 0.0213 45.9578 0.4122 42.1063 1.09375C30.7601 3.09825 28.7001 7.29385 28.7001 15.0312V25.25H55.5126V28.6562H28.7001H18.6376C10.8451 28.6562 4.02184 33.3399 1.8876 42.25C-0.57422 52.4629 -0.68341 58.8351 1.8876 69.5C3.79353 77.4378 8.34514 83.0938 16.1376 83.0938H25.3563V70.8438C25.3563 61.9938 33.0134 54.1875 42.1063 54.1875H68.8876C76.3426 54.1875 82.2939 48.0493 82.2938 40.5625V15.0312C82.2938 7.76491 76.1638 2.30747 68.8876 1.09375C64.2815 0.326257 59.5024 -0.0212988 54.9188 0ZM40.4188 8.21875C43.1883 8.21875 45.4501 10.5164 45.4501 13.3438C45.4501 16.1601 43.1883 18.4375 40.4188 18.4375C37.6393 18.4375 35.3876 16.1601 35.3876 13.3438C35.3876 10.5164 37.6393 8.21875 40.4188 8.21875Z"
      />
      <path
        fill={`url(#${yellowGradientId})`}
        d="M85.6376 28.6562V40.5625C85.6376 49.7943 77.8117 57.5625 68.8876 57.5625H42.1063C34.7704 57.5625 28.7001 63.841 28.7001 71.1875V96.7188C28.7001 103.985 35.0186 108.259 42.1063 110.344C50.5936 112.839 58.7313 113.29 68.8876 110.344C75.6378 108.39 82.2939 104.457 82.2938 96.7188V86.5H55.5126V83.0938H82.2938H95.7C103.492 83.0938 106.396 77.6576 109.106 69.5C111.905 61.1009 111.786 53.0242 109.106 42.25C107.18 34.4926 103.502 28.6562 95.7 28.6562H85.6376ZM70.5751 93.3125C73.3546 93.3125 75.6063 95.5891 75.6063 98.4062C75.6063 101.233 73.3546 103.531 70.5751 103.531C67.8055 103.531 65.5438 101.233 65.5438 98.4062C65.5438 95.5891 67.8055 93.3125 70.5751 93.3125Z"
      />
    </svg>
  );
};
