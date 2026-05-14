import React from 'react';
import { FolderPlus, History as HistoryIcon, ScrollText, Square, SquarePen } from 'lucide-react';
import { type IconProps, defaultSize, defaultStroke, defaultColor } from '@/components/icons/iconUtils';

export const IconNewChat: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <SquarePen size={size} strokeWidth={strokeWidth} className={className} color={color} />;

export const IconNewGroup: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => (
  <FolderPlus
    size={size}
    strokeWidth={strokeWidth}
    className={className}
    color={color}
    data-testid="new-group-folder-icon"
  />
);

export const IconSidebarToggle: React.FC<IconProps> = ({
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
  >
    <line x1="4" x2="20" y1="8" y2="8" />
    <line x1="4" x2="14" y1="16" y2="16" />
  </svg>
);

export const IconHistory: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <HistoryIcon size={size} strokeWidth={strokeWidth} className={className} color={color} />;

export const IconStop: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <Square size={size} strokeWidth={strokeWidth} className={className} color={color} fill={color} />;

export const IconScenarios: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <ScrollText size={size} strokeWidth={strokeWidth} className={className} color={color} />;

// Google G Icon
export const IconGoogle: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </g>
  </svg>
);

// HTML5 Logo
export const IconHtml5: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="#E34F26" d="M71,460 L30,0 481,0 440,460 255,512" />
    <path fill="#EF652A" d="M256,472 L405,431 440,37 256,37" />
    <path
      fill="#EBEBEB"
      d="M256,208 L181,208 176,150 256,150 256,94 255,94 114,94 115,109 129,265 256,265zM256,355 L255,355 192,338 188,293 132,293 139,382 256,414z"
    />
    <path
      fill="#FFFFFF"
      d="M255,208 L255,265 325,265 318,338 255,355 255,414 371,382 372,372 385,223 387,208zM256,94 L256,129 256,150 256,150 389,150 390,150 391,150 392,150 393,150 396,109 397,94z"
    />
  </svg>
);

// TypeScript Logo
export const IconTypeScript: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6 4H42C43.1046 4 44 4.89543 44 6V42C44 43.1046 43.1046 44 42 44H6C4.89543 44 4 43.1046 4 42V6C4 4.89543 4.89543 4 6 4Z"
      fill="#3178C6"
    />
    <path d="M8 13H25V18H19V36H14V18H8V13Z" fill="#FFFFFF" />
    <path
      d="M39.1 18.2C37.8 17.4 36.3 17 34.6 17C32.6 17 31.6 17.6 31.6 18.9C31.6 20 32.4 20.6 34.1 21L36.1 21.4C40.3 22.3 42.4 24.6 42.4 28.1C42.4 30.8 41.5 32.9 39.8 34.4C38.2 35.8 36 36.5 33.1 36.5C30.3 36.5 27.8 35.9 25.6 34.6L27 30.3C28.8 31.4 30.8 32 33 32C35.5 32 36.8 31.3 36.8 29.9C36.8 28.8 36 28.2 34.5 27.8L32.5 27.4C28.2 26.5 26 24.1 26 20.3C26 17.8 26.8 15.9 28.5 14.6C30 13.3 32.1 12.7 34.8 12.7C37.1 12.7 39.2 13.2 41 14.3L39.1 18.2Z"
      fill="#FFFFFF"
    />
  </svg>
);

type LanguageMarkProps = IconProps & {
  bg: string;
  label: string;
  labelColor?: string;
  fontSize?: number;
  rx?: number;
};

const LanguageMark: React.FC<LanguageMarkProps> = ({
  size = defaultSize,
  className,
  bg,
  label,
  labelColor = '#fff',
  fontSize = 18,
  rx = 8,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="40" height="40" rx={rx} fill={bg} />
    <text
      x="24"
      y="25"
      fill={labelColor}
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
      fontSize={fontSize}
      fontWeight="800"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {label}
    </text>
  </svg>
);

export const IconGo: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#00ADD8" label="Go" labelColor="#fff" fontSize={17} rx={12} />
);

export const IconRust: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="18" fill="#2B1B14" />
    <circle cx="24" cy="24" r="13" fill="none" stroke="#F8F1E7" strokeWidth="3" />
    {Array.from({ length: 12 }).map((_, index) => {
      const angle = (index * Math.PI) / 6;
      const x = 24 + Math.cos(angle) * 21;
      const y = 24 + Math.sin(angle) * 21;
      return <circle key={index} cx={x} cy={y} r="2.5" fill="#2B1B14" stroke="#F8F1E7" strokeWidth="1.3" />;
    })}
    <text
      x="24"
      y="25"
      fill="#F8F1E7"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
      fontSize="17"
      fontWeight="900"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      R
    </text>
  </svg>
);

export const IconJava: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="40" height="40" rx="8" fill="#F8FAFC" />
    <path d="M23 7C29 12 15 15 23 21" stroke="#E76F00" strokeWidth="3" strokeLinecap="round" />
    <path d="M29 10C34 15 21 17 28 22" stroke="#E76F00" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M14 25H34L31 35C30.5 37 28.8 38 26.8 38H21.2C19.2 38 17.5 37 17 35L14 25Z" fill="#5382A1" />
    <path d="M34 27H38C38 31 35.5 33 32 33" stroke="#5382A1" strokeWidth="3" strokeLinecap="round" />
    <path d="M16 40H33" stroke="#5382A1" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const IconCSharp: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#68217A" label="C#" labelColor="#fff" fontSize={17} />
);

export const IconKotlin: React.FC<IconProps> = ({ size = defaultSize, className }) => {
  const gradientSeed = React.useId().replace(/:/g, '');
  const gradientId = `kotlin-gradient-${gradientSeed}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0095D5" />
          <stop offset="0.5" stopColor="#7F52FF" />
          <stop offset="1" stopColor="#F18E33" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="8" fill={`url(#${gradientId})`} />
      <path d="M13 13H21V24L32 13H41L27 27L41 41H31L21 30V41H13V13Z" fill="#fff" />
    </svg>
  );
};

export const IconRuby: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M24 6L40 16L34 38L24 44L14 38L8 16L24 6Z" fill="#CC342D" />
    <path d="M24 6L40 16L28 20L8 16L24 6Z" fill="#EF5350" />
    <path d="M28 20L34 38L24 44L22 25L28 20Z" fill="#A91401" />
    <path d="M8 16L22 25L24 44L14 38L8 16Z" fill="#D91404" />
  </svg>
);

export const IconPhp: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <ellipse cx="24" cy="24" rx="21" ry="13" fill="#777BB4" />
    <text
      x="24"
      y="25"
      fill="#fff"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
      fontSize="14"
      fontStyle="italic"
      fontWeight="900"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      php
    </text>
  </svg>
);

export const IconSwift: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#F05138" />
    <path
      d="M35 33C31 38 24 38 18 35C13 32 10 28 8 24C13 28 18 30 23 30C18 26 14 21 11 14C17 20 23 25 29 28C26 23 21 17 17 11C25 17 33 25 35 33Z"
      fill="#fff"
    />
  </svg>
);

export const IconDart: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="40" height="40" rx="8" fill="#0175C2" />
    <path d="M12 18L24 8H38L18 28L12 18Z" fill="#40C4FF" />
    <path d="M18 28L28 38H38V8L18 28Z" fill="#13B9FD" />
    <path d="M12 18V31L19 38H28L18 28L12 18Z" fill="#01579B" />
  </svg>
);

export const IconLua: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="40" height="40" rx="8" fill="#000080" />
    <circle cx="23" cy="26" r="12" fill="#fff" />
    <circle cx="23" cy="26" r="8" fill="#000080" />
    <circle cx="34" cy="14" r="5" fill="#fff" />
  </svg>
);

export const IconCLang: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#A8B9CC" label="C" labelColor="#24364B" fontSize={22} />
);

export const IconCpp: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#00599C" label="C++" labelColor="#fff" fontSize={14} />
);

export const IconSql: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <ellipse cx="24" cy="12" rx="15" ry="6" fill="#38BDF8" />
    <path d="M9 12V34C9 37.3 15.7 40 24 40C32.3 40 39 37.3 39 34V12" fill="#0EA5E9" />
    <ellipse cx="24" cy="34" rx="15" ry="6" fill="#0284C7" />
    <path d="M13 21C16 23 20 24 24 24C28 24 32 23 35 21" stroke="#BAE6FD" strokeWidth="2" />
  </svg>
);

export const IconShell: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="5" y="8" width="38" height="32" rx="6" fill="#101827" />
    <path d="M12 18L18 24L12 30" stroke="#34D399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 31H35" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const IconYaml: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#CB171E" label="Y" labelColor="#fff" fontSize={21} />
);

export const IconToml: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#9C4221" label="T" labelColor="#fff" fontSize={21} />
);

export const IconIni: React.FC<IconProps> = (props) => (
  <LanguageMark {...props} bg="#64748B" label="I" labelColor="#fff" fontSize={21} />
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
