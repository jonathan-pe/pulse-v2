import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStaging } from "@/hooks/usePicksStaging"
import type { MarketWithPick } from "@/lib/api"

// A single grid cell: one market, one outcome. Confirmed (solid fill) beats
// staged (outlined) beats plain. Clicking an already-confirmed outcome is a
// no-op — changing it still works via the other cell, but full removal is
// deferred to the future My Picks page.
export function PriceCell({
  market,
  outcomeIndex,
  eventTitle,
  topLabel,
  outcomeLabel,
}: {
  market: MarketWithPick
  outcomeIndex: 0 | 1
  eventTitle: string
  // Short line/total text shown on the button itself, e.g. "-1.5" or "Over 8.5".
  topLabel?: string
  // Overrides the outcome name sent to the pick slip (defaults to the raw
  // outcome name, e.g. a team) so spreads/totals can carry their line there too.
  outcomeLabel?: string
}) {
  const { staged, stage } = useStaging()
  const confirmed = market.yourPick?.outcomeIndex === outcomeIndex
  const isStaged = staged.get(market.id)?.outcomeIndex === outcomeIndex
  const outcomeName = outcomeIndex === 0 ? market.outcomeAName : market.outcomeBName
  const price = outcomeIndex === 0 ? market.outcomeAPrice : market.outcomeBPrice

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        if (confirmed) return
        stage({
          marketId: market.id,
          outcomeIndex,
          eventTitle,
          marketType: market.marketType,
          line: market.line,
          outcomeName: outcomeLabel ?? outcomeName,
          price,
        })
      }}
      className={cn(
        "h-[52px] w-full flex-col justify-center gap-1 rounded-md border text-center shadow-sm transition-colors",
        confirmed
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
          : isStaged
            ? "border-primary bg-primary/10 text-primary hover:bg-primary/10"
            : "border-border bg-muted/40 hover:bg-muted",
      )}
    >
      {topLabel ? <span className="font-mono text-[11px] font-semibold opacity-70">{topLabel}</span> : null}
      <span className="font-mono text-[15px] font-bold tabular-nums">{(Number(price) * 100).toFixed(1)}%</span>
    </Button>
  )
}

export function EmptyCell() {
  return (
    <div className="flex h-[52px] items-center justify-center rounded-md border border-dashed border-border text-center">
      <span className="font-mono text-[15px] text-muted-foreground/50">—</span>
    </div>
  )
}
