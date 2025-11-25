
import React, { useId } from 'react';

interface GoogleSpinnerProps {
  size?: number | string;
  className?: string;
}

export const GoogleSpinner: React.FC<GoogleSpinnerProps> = ({ size = 24, className = '' }) => {
  const maskId = useId();
  const maskUrl = `url(#${maskId})`;

  return (
    <svg 
      className={`google-spinner ${className}`} 
      width={size} 
      height={size} 
      viewBox="0 0 74 74" 
      xmlns="http://www.w3.org/2000/svg"
    >
       <defs>
          <mask id={maskId}>
             <circle className="google-path-anim" cx="37" cy="37" r="30" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round" />
          </mask>
       </defs>
       <g mask={maskUrl}>
          <circle className="google-color-ring google-c-red" cx="37" cy="37" r="30"></circle>
          <circle className="google-color-ring google-c-blue" cx="37" cy="37" r="30"></circle>
          <circle className="google-color-ring google-c-green" cx="37" cy="37" r="30"></circle>
          <circle className="google-color-ring google-c-yellow" cx="37" cy="37" r="30"></circle>
       </g>
    </svg>
  );
};
