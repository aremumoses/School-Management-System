import { cn } from "@/lib/utils"

/**
 * Loading placeholder (design system §10).
 *
 * A sweeping shimmer rather than a pulsing opacity: a block that fades in
 * and out reads as "broken", whereas directional movement reads as "work in
 * progress". The shimmer itself is attached to `[data-slot="skeleton"]` in
 * app/globals.css — no call site has to opt in — and is already suppressed
 * under prefers-reduced-motion by the global guard there.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
