import React from 'react';

interface LogoMarkProps {
  className?: string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ className = 'w-8 h-8' }) => {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#0F766E" />
      {/* Hotel building silhouette */}
      <path
        d="M9 30V13C9 11.8954 9.89543 11 11 11H21C22.1046 11 23 11.8954 23 13V30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 30H26" stroke="white" strokeWidth="2" strokeLinecap="round" />
      {/* Hotel windows */}
      <rect x="12.5" y="14.5" width="2.5" height="2.5" rx="0.5" fill="white" />
      <rect x="17" y="14.5" width="2.5" height="2.5" rx="0.5" fill="white" />
      <rect x="12.5" y="19.5" width="2.5" height="2.5" rx="0.5" fill="white" />
      <rect x="17" y="19.5" width="2.5" height="2.5" rx="0.5" fill="white" />
      <path d="M14.5 30V25.5H17.5V30" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      {/* Magnifying glass overlay */}
      <circle cx="26.5" cy="22.5" r="5.5" fill="#0F766E" stroke="#FDE68A" strokeWidth="2.2" />
      <path d="M30.5 26.5L34 30" stroke="#FDE68A" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
};
