import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal"
}

function ScrollArea({
  className,
  children,
  orientation = "vertical",
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


