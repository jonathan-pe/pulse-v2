import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { EventWithMarkets, MarketWithPick } from "@/lib/api"
import { EmptyCell, PriceCell } from "./price-cell"

// `line` is stored signed relative to outcome index 0 within its own market
// (independent of moneyline's outcome order) — the paired outcome always
// carries the opposite sign, e.g. "-1.5" for the favorite and "+1.5" for the
// underdog on the same spread market.
function formatSpreadTopLabel(market: MarketWithPick, outcomeIndex: 0 | 1): string {
  if (market.line === null) return ""
  const n = Number(market.line)
  const signed = outcomeIndex === 0 ? n : -n
  return signed > 0 ? `+${signed}` : `−${Math.abs(signed)}`
}

function formatTotalTopLabel(market: MarketWithPick, label: "Over" | "Under"): string {
  if (market.line === null) return label
  return `${label} ${market.line}`
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
      <div className="p-3">
        <Table>
          <colgroup>
            <col />
            <col style={{ width: 92 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 96 }} />
          </colgroup>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="h-auto py-0 pr-3 pb-3 pl-0 text-xs font-normal text-muted-foreground">
                {formatTime(data.event.startTime)}
              </TableHead>
              <TableHead className="h-auto py-0 pr-1 pb-3 pl-0 text-center text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Moneyline
              </TableHead>
              <TableHead className="h-auto px-1 py-0 pb-3 text-center text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Spread
              </TableHead>
              <TableHead className="h-auto py-0 pr-0 pb-3 pl-1 text-center text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Total
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
              const spreadTopLabel =
                spread && spreadIndex !== undefined ? formatSpreadTopLabel(spread, spreadIndex) : ""
              const totalTopLabel = total && totalIndex !== undefined ? formatTotalTopLabel(total, totalLabel) : ""
              // 8px gap between the two rows, split evenly between them (rather
              // than on one side) so it reads the same as the 8px gap Polymarket
              // uses between its own stacked outcome rows.
              const rowSpacing = rowIndex === 0 ? "pt-0 pb-1" : "pt-1 pb-0"

              return (
                <TableRow key={rowIndex} className="border-b-0 hover:bg-transparent">
                  <TableCell
                    className={cn("pr-3 pl-0 text-left font-semibold whitespace-normal", rowSpacing)}
                  >
                    {teamName}
                  </TableCell>
                  <TableCell className={cn("pr-1 pl-0", rowSpacing)}>
                    {moneyline && mlIndex !== undefined ? (
                      <PriceCell market={moneyline} outcomeIndex={mlIndex} eventTitle={data.event.title} />
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>
                  <TableCell className={cn("px-1", rowSpacing)}>
                    {spread && spreadIndex !== undefined ? (
                      <PriceCell
                        market={spread}
                        outcomeIndex={spreadIndex}
                        eventTitle={data.event.title}
                        topLabel={spreadTopLabel}
                        outcomeLabel={`${teamName} ${spreadTopLabel}`.trim()}
                      />
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>
                  <TableCell className={cn("pr-0 pl-1", rowSpacing)}>
                    {total && totalIndex !== undefined ? (
                      <PriceCell
                        market={total}
                        outcomeIndex={totalIndex}
                        eventTitle={data.event.title}
                        topLabel={totalTopLabel}
                        outcomeLabel={totalTopLabel}
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
      </div>
    </Card>
  )
}
