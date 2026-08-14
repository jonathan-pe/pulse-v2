import { useState } from "react"
import { useSubmitPick, useWithdrawPick } from "@/hooks/usePicks"
import type { MarketWithPick } from "@/lib/api"
import { OutcomeButtons } from "./outcome-buttons"

function formatLine(market: MarketWithPick): string {
  if (market.line === null) return ""
  const n = Number(market.line)
  return n < 0 ? `−${Math.abs(n)}` : String(n)
}

// Single market, no alternate lines to step through — moneyline is always
// exactly one per event on Polymarket.
export function MarketRow({ label, market }: { label: string; market: MarketWithPick }) {
  const submit = useSubmitPick()
  const clear = useWithdrawPick()
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <OutcomeButtons
        market={market}
        disabled={market.locked}
        onPick={(outcomeIndex) => submit.mutate({ marketId: market.id, outcomeIndex })}
        onClear={() => clear.mutate(market.id)}
      />
    </div>
  )
}

// Spreads/totals can carry more than one line for the same event. Defaults to
// the highest-volume line, or the caller's own pick if it's on an alternate —
// selection is tracked by market id, not array index, so it survives a
// refetch reordering the list instead of silently pointing at the wrong line.
export function LineGroup({ label, lines }: { label: string; lines: MarketWithPick[] }) {
  const sorted = [...lines].sort((a, b) => Number(b.volume) - Number(a.volume))
  const defaultId = (sorted.find((m) => m.yourPick) ?? sorted[0]).id
  const [selectedId, setSelectedId] = useState(defaultId)
  const submit = useSubmitPick()
  const clear = useWithdrawPick()

  const foundIndex = sorted.findIndex((m) => m.id === selectedId)
  const currentIndex = foundIndex === -1 ? 0 : foundIndex
  const current = sorted[currentIndex]
  const prev = sorted[currentIndex - 1]
  const next = sorted[currentIndex + 1]

  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="w-9 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
            {prev ? formatLine(prev) : ""}
          </span>
          <button
            type="button"
            disabled={!prev}
            aria-label={prev ? `Previous line, ${formatLine(prev)}` : "No previous line"}
            onClick={() => prev && setSelectedId(prev.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-35 enabled:hover:border-primary enabled:hover:text-primary"
          >
            &#8249;
          </button>
          <span className="w-11 text-center font-mono text-xs tabular-nums">{formatLine(current)}</span>
          <button
            type="button"
            disabled={!next}
            aria-label={next ? `Next line, ${formatLine(next)}` : "No next line"}
            onClick={() => next && setSelectedId(next.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-35 enabled:hover:border-primary enabled:hover:text-primary"
          >
            &#8250;
          </button>
          <span className="w-9 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
            {next ? formatLine(next) : ""}
          </span>
        </div>
      </div>
      <OutcomeButtons
        market={current}
        disabled={current.locked}
        onPick={(outcomeIndex) => submit.mutate({ marketId: current.id, outcomeIndex })}
        onClear={() => clear.mutate(current.id)}
      />
    </div>
  )
}
