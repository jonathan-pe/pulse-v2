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
  label,
}: {
  market: MarketWithPick
  outcomeIndex: 0 | 1
  eventTitle: string
  label?: string
}) {
  const { staged, stage } = useStaging()
  const confirmed = market.yourPick?.outcomeIndex === outcomeIndex
  const isStaged = staged.get(market.id)?.outcomeIndex === outcomeIndex
  const outcomeName = outcomeIndex === 0 ? market.outcomeAName : market.outcomeBName
  const price = outcomeIndex === 0 ? market.outcomeAPrice : market.outcomeBPrice

  return (
    <button
      type="button"
      onClick={() => {
        if (confirmed) return
        stage({
          marketId: market.id,
          outcomeIndex,
          eventTitle,
          marketType: market.marketType,
          line: market.line,
          outcomeName: label ? `${label} ${market.line ?? ""}`.trim() : outcomeName,
          price,
        })
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-0.5 py-2 text-center transition-colors",
        confirmed
          ? "bg-primary text-primary-foreground"
          : isStaged
            ? "bg-primary/10 text-primary ring-primary ring-1 ring-inset"
            : "hover:bg-muted",
      )}
    >
      {label ? <span className="text-[10px] opacity-70">{label}</span> : null}
      <span className="font-mono text-[13px] font-semibold tabular-nums">{(Number(price) * 100).toFixed(1)}%</span>
    </button>
  )
}

export function EmptyCell() {
  return <div className="flex items-center justify-center py-2 text-xs text-muted-foreground/50">—</div>
}
