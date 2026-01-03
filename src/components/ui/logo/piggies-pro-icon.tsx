import React from "react";

interface PiggiesProIconProps {
  className?: string;
  size?: number;
}

export const PiggiesProIcon: React.FC<PiggiesProIconProps> = ({
  className = "",
  size = 20,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="proGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Circle background with gold gradient */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#proGoldGradient)"
        stroke="url(#proGoldGradient)"
        strokeWidth="1"
      />

      {/* Pig silhouette */}
      <g fill="white" opacity="0.95">
        {/* Pig snout */}
        <ellipse cx="12" cy="14" rx="4" ry="2.5" />

        {/* Pig nostrils */}
        <ellipse cx="10.5" cy="13.5" rx="0.6" ry="0.4" fill="#d97706" />
        <ellipse cx="13.5" cy="13.5" rx="0.6" ry="0.4" fill="#d97706" />

        {/* Pig ears */}
        <ellipse cx="8" cy="9" rx="1.5" ry="1" transform="rotate(-15 8 9)" />
        <ellipse cx="16" cy="9" rx="1.5" ry="1" transform="rotate(15 16 9)" />

        {/* Pig eyes */}
        <circle cx="10" cy="11.5" r="0.6" fill="#d97706" />
        <circle cx="14" cy="11.5" r="0.6" fill="#d97706" />
      </g>
    </svg>
  );
};
