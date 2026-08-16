import type { EventWithMarkets, MarketWithPick } from "@/lib/api"
import { EmptyCell, PriceCell } from "./price-cell"

function formatLine(market: MarketWithPick): string {
  if (market.line === null) return ""
  const n = Number(market.line)
  return n < 0 ? `−${Math.abs(n)}` : String(n)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { hour: "numeric", minute: "2-digit" })
}

// Highest-volume line, or the caller's own pick if it's on an alternate —
// same selection as the stepper used, just without a control to move off it
// in this overview. Stepping between alternate lines is deferred to a future
// event-detail view.
function pickDefaultLine(lines: MarketWithPick[]): MarketWithPick | undefined {
  if (lines.length === 0) return undefined
  const sorted = [...lines].sort((a, b) => Number(b.volume) - Number(a.volume))
  return sorted.find((m) => m.yourPick) ?? sorted[0]
}

// Markets don't share a common outcome order — a spread or total market can
// list its two outcomes in either order regardless of what moneyline used,
// so "outcome index 0" is never assumed to mean the same thing across market
// types. Every price is looked up by matching the outcome's actual name.
function findOutcomeIndex(market: MarketWithPick | undefined, name: string): 0 | 1 | undefined {
  if (!market) return undefined
  if (market.outcomeAName === name) return 0
  if (market.outcomeBName === name) return 1
  return undefined
}

export function EventRow({ data }: { data: EventWithMarkets }) {
  const moneyline = data.markets.find((m) => m.marketType === "moneyline")
  const spread = pickDefaultLine(data.markets.filter((m) => m.marketType === "spreads"))
  const total = pickDefaultLine(data.markets.filter((m) => m.marketType === "totals"))

  // Team identity comes from moneyline, falling back to spread if moneyline
  // itself got filtered out (e.g. locked while spread stayed open). Totals
  // never carries team identity — Over/Under only — so it's never a source.
  const identitySource = moneyline ?? spread
  const teams = [identitySource?.outcomeAName ?? "Team A", identitySource?.outcomeBName ?? "Team B"] as const

  const overIndex = findOutcomeIndex(total, "Over")
  const underIndex = findOutcomeIndex(total, "Under")

  return (
    <div className="mb-2.5 overflow-hidden rounded-xl bg-card">
      <div className="border-b border-border px-3.5 py-2 text-xs text-muted-foreground">
        {formatTime(data.event.startTime)}
      </div>
      <table className="w-full border-collapse text-sm">
        <colgroup>
          <col />
          <col style={{ width: 84 }} />
          <col style={{ width: 88 }} />
          <col style={{ width: 88 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border-b border-border" />
            <th className="border-b border-l border-border py-1.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              Moneyline
            </th>
            <th className="border-b border-l border-border py-1.5 font-mono text-[11px] font-bold text-muted-foreground normal-case">
              {spread ? formatLine(spread) : "—"}
            </th>
            <th className="border-b border-l border-border py-1.5 font-mono text-[11px] font-bold text-muted-foreground normal-case">
              {total ? formatLine(total) : "—"}
            </th>
          </tr>
        </thead>
        <tbody>
          {([0, 1] as const).map((rowIndex) => {
            const teamName = teams[rowIndex]
            const mlIndex = findOutcomeIndex(moneyline, teamName)
            const spreadIndex = findOutcomeIndex(spread, teamName)
            const totalIndex = rowIndex === 0 ? overIndex : underIndex
            const totalLabel = rowIndex === 0 ? "Over" : "Under"

            return (
              <tr key={rowIndex} className={rowIndex === 0 ? "border-b border-dashed border-border" : ""}>
                <td className="px-3.5 py-2.5 text-left font-semibold">{teamName}</td>
                <td className="border-l border-border p-0">
                  {moneyline && mlIndex !== undefined ? (
                    <PriceCell market={moneyline} outcomeIndex={mlIndex} eventTitle={data.event.title} />
                  ) : (
                    <EmptyCell />
                  )}
                </td>
                <td className="border-l border-border p-0">
                  {spread && spreadIndex !== undefined ? (
                    <PriceCell market={spread} outcomeIndex={spreadIndex} eventTitle={data.event.title} />
                  ) : (
                    <EmptyCell />
                  )}
                </td>
                <td className="border-l border-border p-0">
                  {total && totalIndex !== undefined ? (
                    <PriceCell
                      market={total}
                      outcomeIndex={totalIndex}
                      eventTitle={data.event.title}
                      label={totalLabel}
                    />
                  ) : (
                    <EmptyCell />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
