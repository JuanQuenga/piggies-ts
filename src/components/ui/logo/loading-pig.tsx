import React from "react";
import { cn } from "@/lib/utils";

interface LoadingPigProps {
  size?: number;
  className?: string;
}

export const LoadingPig: React.FC<LoadingPigProps> = ({
  size = 48,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="-2 -2 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="proAdGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
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
        <path
          d="M34.193 13.329a5.975 5.975 0 0 0 1.019-1.28c1.686-2.854.27-10.292-.592-10.8c-.695-.411-5.529 1.05-8.246 3.132C23.876 2.884 21.031 2 18 2c-3.021 0-5.856.879-8.349 2.367C6.93 2.293 2.119.839 1.424 1.249c-.861.508-2.276 7.947-.592 10.8c.278.471.615.884.989 1.249C.666 15.85 0 18.64 0 21.479C0 31.468 8.011 34 18 34s18-2.532 18-12.521c0-2.828-.66-5.606-1.807-8.15z"
          stroke="url(#proAdGradient)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M28 23.125c0 4.487-3.097 9.375-10 9.375c-6.904 0-10-4.888-10-9.375S11.096 17.5 18 17.5c6.903 0 10 1.138 10 5.625z"
          stroke="url(#proAdGradient)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
};
