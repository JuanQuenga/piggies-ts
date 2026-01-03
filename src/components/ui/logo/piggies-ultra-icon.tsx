import React from "react";

interface PiggiesUltraIconProps {
  className?: string;
  size?: number;
}

export const PiggiesUltraIcon: React.FC<PiggiesUltraIconProps> = ({
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
        <linearGradient id="proGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b">
            <animate
              attributeName="stop-color"
              values="#ff6b6b;#4ecdc4;#45b7d1;#96ceb4;#feca57;#ff9ff3;#54a0ff;#5f27cd;#ff6b6b"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#4ecdc4">
            <animate
              attributeName="stop-color"
              values="#4ecdc4;#45b7d1;#96ceb4;#feca57;#ff9ff3;#54a0ff;#5f27cd;#ff6b6b;#4ecdc4"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#5f27cd">
            <animate
              attributeName="stop-color"
              values="#5f27cd;#ff6b6b;#4ecdc4;#45b7d1;#96ceb4;#feca57;#ff9ff3;#54a0ff;#5f27cd"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Circle background with animated gradient */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#proGradient)"
        stroke="url(#proGradient)"
        strokeWidth="1"
      />

      {/* Pig silhouette */}
      <g fill="white" opacity="0.9">
        {/* Pig snout */}
        <ellipse cx="12" cy="14" rx="4" ry="2.5" />

        {/* Pig nostrils */}
        <ellipse cx="10.5" cy="13.5" rx="0.6" ry="0.4" />
        <ellipse cx="13.5" cy="13.5" rx="0.6" ry="0.4" />

        {/* Pig ears */}
        <ellipse cx="8" cy="9" rx="1.5" ry="1" transform="rotate(-15 8 9)" />
        <ellipse cx="16" cy="9" rx="1.5" ry="1" transform="rotate(15 16 9)" />

        {/* Pig eyes */}
        <circle cx="10" cy="11.5" r="0.6" />
        <circle cx="14" cy="11.5" r="0.6" />
      </g>
    </svg>
  );
};
