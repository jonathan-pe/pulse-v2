import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPoints } from '@/lib/picks-summary'
import type { PickOutcomeStatus, PickResult } from '@/lib/api'
import type { MyPicksSearch, SortField } from '@/lib/picks-search'

const MARKET_LABEL = {
  moneyline: 'Moneyline',
  spreads: 'Spread',
  totals: 'Total',
} as const

const STATUS_LABEL: Record<PickOutcomeStatus, string> = {
  upcoming: 'Upcoming',
  pending: 'Pending',
  won: 'Won',
  lost: 'Lost',
}

const STATUS_CLASS: Record<PickOutcomeStatus, string> = {
  upcoming: 'bg-muted text-muted-foreground',
  // Ember is the app's existing "something's happening" accent (same as the
  // live-game pulse dot) — pending picks are waiting on settlement, which is
  // a genuinely different state from upcoming's inert "hasn't happened yet".
  pending: 'bg-ember/15 text-ember',
  won: 'bg-win/15 text-win',
  lost: 'bg-loss/15 text-loss',
}

function pickDescription(result: PickResult): string {
  const { market, pick } = result
  const outcomeName = pick.outcomeIndex === 0 ? market.outcomeAName : market.outcomeBName
  if (market.marketType === 'totals') {
    return `${outcomeName} ${market.line ?? ''}`.trim()
  }
  if (market.marketType === 'spreads' && market.line !== null) {
    return `${outcomeName} ${market.line}`.trim()
  }
  return outcomeName
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// priceAtPick is Polymarket's implied probability (0-1) of the picked
// outcome at pick time — the same number scorePick()/brierScore() use, just
// shown back to the user as the odds they took.
function formatOdds(priceAtPick: string): string {
  return `${Math.round(Number(priceAtPick) * 100)}%`
}

// Final score, not the market outcome — how close the pick actually was.
// Totals picks care about the combined score, not either team's individually;
// spread/moneyline picks care about the score in the same team order the
// event title already uses ("X vs. Y"), so just the numbers read naturally
// on their own.
function formatFinalScore(result: PickResult): string | null {
  const { teamAScore, teamBScore } = result.event
  if (teamAScore === null || teamBScore === null) return null
  if (result.market.marketType === 'totals') {
    return String(teamAScore + teamBScore)
  }
  return `${teamAScore}–${teamBScore}`
}

function SortHeader({
  field,
  label,
  search,
  onSort,
  align = 'left',
}: {
  field: SortField
  label: string
  search: MyPicksSearch
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const active = search.sortBy === field
  const Icon = active ? (search.sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase transition-colors hover:text-foreground',
        active ? 'text-foreground' : 'text-muted-foreground',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon className={cn('size-3', active ? 'text-primary' : 'text-muted-foreground/60')} />
    </button>
  )
}

export function PicksTable({
  picks,
  search,
  onSort,
}: {
  picks: PickResult[]
  search: MyPicksSearch
  onSort: (field: SortField) => void
}) {
  return (
    <Table>
      <colgroup>
        <col />
        <col style={{ width: 160 }} />
        <col style={{ width: 70 }} />
        <col style={{ width: 80 }} />
        <col style={{ width: 100 }} />
        <col style={{ width: 90 }} />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-auto py-2.5 pl-4 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            <SortHeader field="date" label="Event" search={search} onSort={onSort} />
          </TableHead>
          <TableHead className="h-auto py-2.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            Your pick
          </TableHead>
          <TableHead className="h-auto py-2.5 text-left text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            <SortHeader field="odds" label="Odds" search={search} onSort={onSort} />
          </TableHead>
          <TableHead className="h-auto py-2.5 text-left text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            Score
          </TableHead>
          <TableHead className="h-auto py-2.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            Result
          </TableHead>
          <TableHead className="h-auto py-2.5 pr-4 text-right text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            <SortHeader field="points" label="Points" search={search} onSort={onSort} align="right" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {picks.map((result) => {
          const finalScore = formatFinalScore(result)
          return (
            <TableRow key={result.pick.id}>
              <TableCell className="py-3 pl-4 text-left whitespace-normal">
                <div className="truncate font-semibold">{result.event.title}</div>
                <div className="text-xs text-muted-foreground">{formatDate(result.event.startTime)}</div>
              </TableCell>
              <TableCell className="py-3 text-left whitespace-normal">
                <div>{pickDescription(result)}</div>
                <div className="text-xs text-muted-foreground">{MARKET_LABEL[result.market.marketType]}</div>
              </TableCell>
              <TableCell className="py-3 text-left font-mono text-sm tabular-nums text-muted-foreground">
                {formatOdds(result.pick.priceAtPick)}
              </TableCell>
              <TableCell className="py-3 text-left font-mono text-sm tabular-nums text-muted-foreground">
                {finalScore ?? '—'}
              </TableCell>
              <TableCell className="py-3 text-left">
                <Badge className={cn('border-transparent font-bold tracking-wide uppercase', STATUS_CLASS[result.status])}>
                  {STATUS_LABEL[result.status]}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  'py-3 pr-4 text-right font-mono tabular-nums',
                  result.points === null ? 'text-muted-foreground' : result.points >= 0 ? 'text-win' : 'text-loss',
                )}
              >
                {result.points === null ? '—' : formatPoints(result.points)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
