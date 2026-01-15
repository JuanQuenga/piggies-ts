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
        "relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div
        ref={viewportRef}
        className={cn(
          "h-full w-full overflow-auto",
          orientation === "horizontal" ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { ScrollArea }


