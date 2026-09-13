import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { contrastTextColor } from "@/lib/color"
import { useStaging } from "@/hooks/usePicksStaging"
import type { MarketWithPick } from "@/lib/api"

// A single grid cell: one market, one outcome. Confirmed (solid fill) beats
// staged (outlined) beats plain. Clicking an already-confirmed outcome is a
// no-op — changing it still works via the other cell, but full removal is
// deferred to the future My Picks page.
export function PriceCell({
  market,
  outcomeIndex,
  eventId,
  eventTitle,
  topLabel,
  outcomeLabel,
  accentColor,
  teamLogoUrl,
  tone,
}: {
  market: MarketWithPick
  outcomeIndex: 0 | 1
  // Groups this pick with any others from the same event in the pick slip.
  eventId: string
  eventTitle: string
  // Short line/total text shown on the button itself, e.g. "-1.5" or "Over 8.5".
  topLabel?: string
  // Overrides the outcome name sent to the pick slip (defaults to the raw
  // outcome name, e.g. a team) so spreads/totals can carry their line there too.
  outcomeLabel?: string
  // The picked team's own brand color (moneyline/spread only — Over/Under
  // has no team to color by, use `tone` there instead). Applied as inline
  // style so it overrides the primary-color utility classes below without
  // duplicating the className branches; null/undefined (no color resolved)
  // falls back to the app's own primary accent untouched.
  accentColor?: string | null
  // The same team's logo, carried through to the pick slip so a staged
  // entry there can show the same badge as everywhere else — PriceCell has
  // no reason to render it itself, only to pass it along when staging.
  teamLogoUrl?: string | null
  // Over/Under has no team to color by, but does have a fixed semantic
  // color: Over reuses the app's win-green, Under its destructive-red —
  // both already have a contrast-tested foreground pair (see index.css),
  // so this goes through plain classes rather than accentColor's inline
  // style + computed contrast.
  tone?: "win" | "destructive"
}) {
  const { staged, stage } = useStaging()
  const confirmed = market.yourPick?.outcomeIndex === outcomeIndex
  const isStaged = staged.get(market.id)?.outcomeIndex === outcomeIndex
  const outcomeName = outcomeIndex === 0 ? market.outcomeAName : market.outcomeBName
  const price = outcomeIndex === 0 ? market.outcomeAPrice : market.outcomeBPrice

  // Staged text deliberately stays the app's own foreground color rather
  // than the team's — a light/desaturated brand color (Raiders silver,
  // Steelers gold) reads fine as a solid confirmed fill but is unreliable as
  // text over a near-background tint. The tint + border still carry the
  // team color; only the text opts out, so every team stays legible here.
  const accentStyle =
    accentColor && confirmed
      ? { backgroundColor: accentColor, borderColor: accentColor, color: contrastTextColor(accentColor) }
      : accentColor && isStaged
        ? {
            backgroundColor: `color-mix(in oklch, ${accentColor}, transparent 88%)`,
            borderColor: `color-mix(in oklch, ${accentColor}, transparent 40%)`,
          }
        : undefined

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        if (confirmed) return
        stage({
          marketId: market.id,
          outcomeIndex,
          eventId,
          eventTitle,
          marketType: market.marketType,
          line: market.line,
          outcomeName: outcomeLabel ?? outcomeName,
          price,
          teamLogoUrl,
          teamColor: accentColor,
          tone,
        })
      }}
      style={accentStyle}
      className={cn(
        "h-14 w-full flex-col justify-center gap-1 rounded-md border text-center shadow-sm transition-colors",
        tone === "win"
          ? confirmed
            ? "border-win bg-win text-win-foreground hover:bg-win"
            : isStaged
              ? "border-win bg-win/10 text-foreground hover:bg-win/10"
              : "border-border bg-muted/40 hover:bg-muted"
          : tone === "destructive"
            ? confirmed
              ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive"
              : isStaged
                ? "border-destructive bg-destructive/10 text-foreground hover:bg-destructive/10"
                : "border-border bg-muted/40 hover:bg-muted"
            : confirmed
              ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
              : isStaged
                ? cn("border-primary bg-primary/10 hover:bg-primary/10", accentColor ? "text-foreground" : "text-primary")
                : "border-border bg-muted/40 hover:bg-muted",
      )}
    >
      {topLabel ? <span className="font-mono text-xs font-semibold opacity-70">{topLabel}</span> : null}
      <span className="font-mono text-base font-bold tabular-nums">{(Number(price) * 100).toFixed(1)}%</span>
    </Button>
  )
}

export function EmptyCell() {
  return (
    <div className="flex h-14 items-center justify-center rounded-md border border-dashed border-border text-center">
      <span className="font-mono text-base text-muted-foreground/50">—</span>
    </div>
  )
}
