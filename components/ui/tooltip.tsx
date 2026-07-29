"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { useSurfaceClassName } from "@/components/surface-theme"
import { cn } from "@/lib/utils"

function TooltipProvider({ ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  align = "center",
  className,
  side = "right",
  sideOffset = 8,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset"
  >) {
  const surfaceClassName = useSurfaceClassName()

  return (
    <TooltipPrimitive.Portal className={surfaceClassName}>
      <TooltipPrimitive.Positioner
        align={align}
        className="z-60"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            "rounded-md bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-sm ring-1 ring-foreground/10 [animation-duration:var(--motion-duration)] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none",
            className
          )}
          data-slot="tooltip-content"
          role="tooltip"
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
