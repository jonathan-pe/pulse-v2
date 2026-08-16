import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    <Card className="mb-2.5 gap-0 py-0">
      <div className="border-b border-border px-3.5 py-2 text-xs text-muted-foreground">
        {formatTime(data.event.startTime)}
      </div>
      <Table className="border-collapse">
        <colgroup>
          <col />
          <col style={{ width: 84 }} />
          <col style={{ width: 88 }} />
          <col style={{ width: 88 }} />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-auto border-b border-border p-0" />
            <TableHead className="h-auto border-b border-border py-1.5 text-center text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              Moneyline
            </TableHead>
            <TableHead className="h-auto border-b border-border py-1.5 text-center font-mono text-[11px] font-bold text-muted-foreground normal-case">
              {spread ? formatLine(spread) : "—"}
            </TableHead>
            <TableHead className="h-auto border-b border-border py-1.5 text-center font-mono text-[11px] font-bold text-muted-foreground normal-case">
              {total ? formatLine(total) : "—"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {([0, 1] as const).map((rowIndex) => {
            const teamName = teams[rowIndex]
            const mlIndex = findOutcomeIndex(moneyline, teamName)
            const spreadIndex = findOutcomeIndex(spread, teamName)
            const totalIndex = rowIndex === 0 ? overIndex : underIndex
            const totalLabel = rowIndex === 0 ? "Over" : "Under"

            return (
              <TableRow
                key={rowIndex}
                className={
                  rowIndex === 0
                    ? "border-b border-dashed border-border hover:bg-transparent"
                    : "border-b-0 hover:bg-transparent"
                }
              >
                <TableCell className="px-3.5 py-2.5 text-left font-semibold whitespace-normal">{teamName}</TableCell>
                <TableCell className="p-0">
                  {moneyline && mlIndex !== undefined ? (
                    <PriceCell market={moneyline} outcomeIndex={mlIndex} eventTitle={data.event.title} />
                  ) : (
                    <EmptyCell />
                  )}
                </TableCell>
                <TableCell className="p-0">
                  {spread && spreadIndex !== undefined ? (
                    <PriceCell market={spread} outcomeIndex={spreadIndex} eventTitle={data.event.title} />
                  ) : (
                    <EmptyCell />
                  )}
                </TableCell>
                <TableCell className="p-0">
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
