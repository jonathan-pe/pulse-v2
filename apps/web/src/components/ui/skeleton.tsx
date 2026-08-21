import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-[linear-gradient(100deg,var(--color-muted)_30%,color-mix(in_oklch,var(--color-muted),var(--color-foreground)_8%)_45%,var(--color-muted)_60%)] bg-size-[300%_100%] motion-safe:animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:opacity-70",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
