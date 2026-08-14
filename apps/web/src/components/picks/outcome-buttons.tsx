import { cn } from "@/lib/utils"
import type { MarketWithPick } from "@/lib/api"

function formatPct(price: string): string {
  return `${(Number(price) * 100).toFixed(1)}%`
}

export function OutcomeButtons({
  market,
  disabled,
  onPick,
  onClear,
}: {
  market: MarketWithPick
  disabled: boolean
  onPick: (outcomeIndex: 0 | 1) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="flex flex-1 gap-2">
        {([0, 1] as const).map((outcomeIndex) => {
          const picked = market.yourPick?.outcomeIndex === outcomeIndex
          const name = outcomeIndex === 0 ? market.outcomeAName : market.outcomeBName
          const price = outcomeIndex === 0 ? market.outcomeAPrice : market.outcomeBPrice
          return (
            <button
              key={outcomeIndex}
              type="button"
              disabled={disabled}
              onClick={() => onPick(outcomeIndex)}
              className={cn(
                "flex flex-1 items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                picked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card enabled:hover:border-primary/50",
                disabled && "cursor-default opacity-60",
              )}
            >
              <span>{name}</span>
              <span className="font-mono text-xs tabular-nums opacity-70">{formatPct(price)}</span>
            </button>
          )
        })}
      </div>
      {market.yourPick && !disabled ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}
