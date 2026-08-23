"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({ className, ...props }: ProgressPrimitive.Root.Props) {
  return <ProgressPrimitive.Root data-slot="progress" className={className} {...props} />
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("absolute h-full rounded-full bg-primary transition-all duration-150", className)}
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator }
