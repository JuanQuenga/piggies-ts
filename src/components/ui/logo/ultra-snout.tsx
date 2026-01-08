import React from 'react'

interface UltraSnoutProps {
  className?: string
  size?: number
}

export const UltraSnout: React.FC<UltraSnoutProps> = ({
  className = '',
  size = 24,
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
        <linearGradient
          id="rainbowGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ff0000">
            <animate
              attributeName="stop-color"
              values="#ff0000;#ff8000;#ffff00;#80ff00;#00ff00;#00ff80;#00ffff;#0080ff;#0000ff;#8000ff;#ff00ff;#ff0080;#ff0000"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#00ff00">
            <animate
              attributeName="stop-color"
              values="#00ff00;#00ff80;#00ffff;#0080ff;#0000ff;#8000ff;#ff00ff;#ff0080;#ff0000;#ff8000;#ffff00;#80ff00;#00ff00"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#0000ff">
            <animate
              attributeName="stop-color"
              values="#0000ff;#8000ff;#ff00ff;#ff0080;#ff0000;#ff8000;#ffff00;#80ff00;#00ff00;#00ff80;#00ffff;#0080ff;#0000ff"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Pig snout */}
      <ellipse
        cx="12"
        cy="14"
        rx="6"
        ry="4"
        fill="url(#rainbowGradient)"
        stroke="url(#rainbowGradient)"
        strokeWidth="0.5"
      />

      {/* Pig nostrils */}
      <ellipse
        cx="10.5"
        cy="13.5"
        rx="0.8"
        ry="0.6"
        fill="#000"
        opacity="0.7"
      />
      <ellipse
        cx="13.5"
        cy="13.5"
        rx="0.8"
        ry="0.6"
        fill="#000"
        opacity="0.7"
      />

      {/* Pig ears */}
      <ellipse
        cx="8"
        cy="8"
        rx="2"
        ry="1.5"
        fill="url(#rainbowGradient)"
        stroke="url(#rainbowGradient)"
        strokeWidth="0.5"
        transform="rotate(-15 8 8)"
      />
      <ellipse
        cx="16"
        cy="8"
        rx="2"
        ry="1.5"
        fill="url(#rainbowGradient)"
        stroke="url(#rainbowGradient)"
        strokeWidth="0.5"
        transform="rotate(15 16 8)"
      />

      {/* Pig eyes */}
      <circle cx="10" cy="11" r="0.8" fill="#000" opacity="0.8" />
      <circle cx="14" cy="11" r="0.8" fill="#000" opacity="0.8" />

      {/* Eye highlights */}
      <circle cx="10.3" cy="10.7" r="0.3" fill="#fff" />
      <circle cx="14.3" cy="10.7" r="0.3" fill="#fff" />
    </svg>
  )
}
