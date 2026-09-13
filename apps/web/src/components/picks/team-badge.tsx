import { useState } from "react"
import { cn } from "@/lib/utils"
import type { TeamSummary } from "@/lib/api"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const chars = parts.length > 1 ? [parts[0]![0], parts.at(-1)![0]] : [parts[0]?.[0] ?? "?"]
  return chars.join("").toUpperCase()
}

// Renders the real team logo once team.logoUrl resolves (see ingestion's
// fetchGammaTeam), falling back to an initials chip tinted with the team's
// own brand color — same layout slot either way, so a lookup miss never
// shifts the row around it. `<img>`'s onError swaps to the fallback rather
// than leaving a broken-image icon if a resolved URL 404s later.
export function TeamBadge({ team, className }: { team: TeamSummary; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = team.logoUrl && !imageFailed

  if (showImage) {
    return (
      <img
        src={team.logoUrl!}
        alt=""
        // Source art is a square canvas, but not reliably a circular crest
        // with even margin to the edge — some designs run corner-to-corner
        // (seen on MLB's logos specifically), which a rounded-full mask
        // clips no matter how much inner padding is added. A square-ish
        // container with object-contain fits the whole square canvas with
        // nothing cropped, regardless of how the art itself is composed.
        className={cn("size-10 shrink-0 rounded-lg bg-muted object-contain p-1", className)}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
        className,
      )}
      style={
        team.color
          ? { background: `color-mix(in oklch, ${team.color}, transparent 85%)`, color: team.color }
          : { background: "var(--color-accent)", color: "var(--color-primary)" }
      }
    >
      {initials(team.name)}
    </div>
  )
}
