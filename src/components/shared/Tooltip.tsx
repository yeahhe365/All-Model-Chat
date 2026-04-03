
import React from 'react';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="tooltip-container ml-1.5">
    {children}
    <span className="tooltip-text">{text}</span>
  </div>
);
