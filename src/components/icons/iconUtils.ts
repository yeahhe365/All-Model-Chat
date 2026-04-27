import React from 'react';

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

// Generic Defaults
export const defaultSize = 24;
export const defaultStroke = 2;
export const defaultColor = 'currentColor';

interface StrokeIconProps extends IconProps {
  children: React.ReactNode;
  viewBox?: string;
}

export const StrokeIcon: React.FC<StrokeIconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
  viewBox = '0 0 24 24',
  children,
}) =>
  React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox,
      fill: 'none',
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className,
    },
    children,
  );
