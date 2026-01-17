import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal"
  viewportRef?: React.RefObject<HTMLDivElement | null>
}

function ScrollArea({
  className,
  children,
  orientation = "vertical",
  viewportRef,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-hidden group/scroll",
        className
      )}
      {...props}
    >
      <div
        ref={viewportRef}
        className={cn(
          "h-full w-full scroll-area-viewport",
          orientation === "horizontal" ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden"
        )}
      >
        {children}
      </div>
      <style>{`
        .scroll-area-viewport::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scroll-area-viewport::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-area-viewport::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 9999px;
          transition: background 0.2s;
        }
        .group\\/scroll:hover .scroll-area-viewport::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
        }
        .scroll-area-viewport::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        /* Firefox */
        .scroll-area-viewport {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .group\\/scroll:hover .scroll-area-viewport {
          scrollbar-color: hsl(var(--border)) transparent;
        }
      `}</style>
    </div>
  )
}

export { ScrollArea }
