import { Card } from "@/components/ui/card"
import { timeAgo } from "@/lib/format"
import type { EventWithMarkets, MarketWithPick, TeamSummary } from "@/lib/api"
import { EmptyCell, PriceCell } from "./price-cell"
import { TeamBadge } from "./team-badge"

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

function TeamRow({
  team,
  moneyline,
  mlIndex,
  spread,
  spreadIndex,
  spreadTopLabel,
  total,
  totalIndex,
  totalTopLabel,
  totalTone,
  eventId,
  eventTitle,
  teamName,
}: {
  team: TeamSummary
  moneyline: MarketWithPick | undefined
  mlIndex: 0 | 1 | undefined
  spread: MarketWithPick | undefined
  spreadIndex: 0 | 1 | undefined
  spreadTopLabel: string
  total: MarketWithPick | undefined
  totalIndex: 0 | 1 | undefined
  totalTopLabel: string
  totalTone: "win" | "destructive"
  eventId: string
  eventTitle: string
  teamName: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <TeamBadge team={team} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{team.name}</div>
        {team.record ? <div className="font-mono text-xs text-muted-foreground">{team.record}</div> : null}
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <div className="w-23">
          {moneyline && mlIndex !== undefined ? (
            <PriceCell
              market={moneyline}
              outcomeIndex={mlIndex}
              eventId={eventId}
              eventTitle={eventTitle}
              accentColor={team.color}
              teamLogoUrl={team.logoUrl}
            />
          ) : (
            <EmptyCell />
          )}
        </div>
        <div className="w-23">
          {spread && spreadIndex !== undefined ? (
            <PriceCell
              market={spread}
              outcomeIndex={spreadIndex}
              eventId={eventId}
              eventTitle={eventTitle}
              topLabel={spreadTopLabel}
              outcomeLabel={`${teamName} ${spreadTopLabel}`.trim()}
              accentColor={team.color}
              teamLogoUrl={team.logoUrl}
            />
          ) : (
            <EmptyCell />
          )}
        </div>
        <div className="w-23">
          {total && totalIndex !== undefined ? (
            <PriceCell
              market={total}
              outcomeIndex={totalIndex}
              eventId={eventId}
              eventTitle={eventTitle}
              topLabel={totalTopLabel}
              outcomeLabel={totalTopLabel}
              tone={totalTone}
            />
          ) : (
            <EmptyCell />
          )}
        </div>
      </div>
    </div>
  )
}

// One header for the whole list of cards below it, rather than repeating
// "Moneyline / Spread / Total" inside every single card — same column
// widths/gaps/padding as TeamRow's price grid so it lines up exactly.
// `label` (a date, or "Popular") shares the same line rather than sitting on
// a row of its own above it.
export function MarketColumnHeaders({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 pb-2">
      <div className="min-w-0 flex-1 text-sm font-bold tracking-wide text-foreground uppercase">{label}</div>
      <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center text-xs font-bold tracking-wide text-muted-foreground uppercase">
        <div className="w-23">Moneyline</div>
        <div className="w-23">Spread</div>
        <div className="w-23">Total</div>
      </div>
    </div>
  )
}

export function EventRow({ data }: { data: EventWithMarkets }) {
  const moneyline = data.markets.find((m) => m.marketType === "moneyline")
  const spread = pickDefaultLine(data.markets.filter((m) => m.marketType === "spreads"))
  const total = pickDefaultLine(data.markets.filter((m) => m.marketType === "totals"))

  // Team identity comes from moneyline, falling back to spread if moneyline
  // itself got filtered out (e.g. locked while spread stayed open). Totals
  // never carries team identity — Over/Under only — so it's never a source.
  const identitySource = moneyline ?? spread
  const teamNames = [identitySource?.outcomeAName ?? data.event.teamA.name, identitySource?.outcomeBName ?? data.event.teamB.name] as const
  const teams = [data.event.teamA, data.event.teamB] as const

  const overIndex = findOutcomeIndex(total, "Over")
  const underIndex = findOutcomeIndex(total, "Under")

  return (
    <Card className="mb-2.5 gap-0 overflow-hidden py-0">
      {data.event.isLive ? (
        <div className="flex items-center gap-1.5 bg-ember/5 px-3 py-1.5 text-xs font-bold tracking-wide text-ember uppercase">
          <span className="size-1.5 shrink-0 rounded-full bg-ember motion-safe:animate-[pulse-dot_1.4s_ease-in-out_infinite]" />
          Live
          <span className="font-mono font-normal normal-case text-ember/70">· updated {timeAgo(data.event.lastSyncedAt)}</span>
        </div>
      ) : (
        <div className="px-3 py-1.5 text-xs font-normal text-muted-foreground">
          {formatTime(data.event.startTime)}
        </div>
      )}

      {([0, 1] as const).map((rowIndex) => {
        const teamName = teamNames[rowIndex]
        const mlIndex = findOutcomeIndex(moneyline, teamName)
        const spreadIndex = findOutcomeIndex(spread, teamName)
        const totalIndex = rowIndex === 0 ? overIndex : underIndex
        const totalLabel = rowIndex === 0 ? "Over" : "Under"
        const spreadTopLabel = spread && spreadIndex !== undefined ? formatSpreadTopLabel(spread, spreadIndex) : ""
        const totalTopLabel = total && totalIndex !== undefined ? formatTotalTopLabel(total, totalLabel) : ""

        return (
          <TeamRow
            key={rowIndex}
            team={teams[rowIndex]}
            moneyline={moneyline}
            mlIndex={mlIndex}
            spread={spread}
            spreadIndex={spreadIndex}
            spreadTopLabel={spreadTopLabel}
            total={total}
            totalIndex={totalIndex}
            totalTopLabel={totalTopLabel}
            totalTone={totalLabel === "Over" ? "win" : "destructive"}
            eventId={data.event.id}
            eventTitle={data.event.title}
            teamName={teamName}
          />
        )
      })}
    </Card>
  )
}
