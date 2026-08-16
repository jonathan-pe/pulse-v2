import { createFileRoute, redirect } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMyPicks } from '@/hooks/usePicks'
import { authClient } from '@/lib/auth-client'
import { formatPoints, summarizePicks } from '@/lib/picks-summary'
import type { PickOutcomeStatus, PickResult } from '@/lib/api'

export const Route = createFileRoute('/picks')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: MyPicksPage,
})

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
  pending: 'bg-muted text-muted-foreground',
  won: 'bg-primary/10 text-primary',
  lost: 'bg-destructive/10 text-destructive',
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

function MyPicksPage() {
  const { data, isPending, isError } = useMyPicks()
  const picks = data?.picks ?? []

  const { totalPoints, won, lost } = summarizePicks(picks)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium">My Picks</h1>
        {picks.length > 0 ? (
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {won}–{lost}
            {' · '}
            <span className={totalPoints >= 0 ? 'text-primary' : 'text-destructive'}>{formatPoints(totalPoints)} pts</span>
          </span>
        ) : null}
      </div>

      {isPending ? <p className="text-sm text-muted-foreground">Loading picks…</p> : null}
      {isError ? <p className="text-sm text-destructive">Couldn't load picks. Try refreshing.</p> : null}
      {!isPending && !isError && picks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No picks yet — head to a league to make your first one.</p>
      ) : null}

      {picks.length > 0 ? (
        <div className="overflow-hidden rounded-xl bg-card">
          <Table>
            <colgroup>
              <col />
              <col style={{ width: 160 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto py-2.5 pl-4 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Event
                </TableHead>
                <TableHead className="h-auto py-2.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Your pick
                </TableHead>
                <TableHead className="h-auto py-2.5 text-right text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Score
                </TableHead>
                <TableHead className="h-auto py-2.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Result
                </TableHead>
                <TableHead className="h-auto py-2.5 pr-4 text-right text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Points
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
                  <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {finalScore ?? '—'}
                  </TableCell>
                  <TableCell className="py-3 text-left">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', STATUS_CLASS[result.status])}>
                      {STATUS_LABEL[result.status]}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'py-3 pr-4 text-right font-mono tabular-nums',
                      result.points === null ? 'text-muted-foreground' : result.points >= 0 ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    {result.points === null ? '—' : formatPoints(result.points)}
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
