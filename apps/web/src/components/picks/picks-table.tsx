import { useMemo } from 'react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type Column,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TeamBadge } from '@/components/picks/team-badge'
import { cn } from '@/lib/utils'
import { formatDate, formatPoints } from '@/lib/picks-summary'
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

// Only rowSortingFeature is enabled — filtering/pagination stay server-driven
// (via PicksFilterBar/PicksPagination + the URL), so the table never needs
// its own row models for those. manualSorting below means this feature only
// supplies the header click / sort-state bookkeeping, not actual reordering.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, PickResult>()

function sortableHeader(label: string, align: 'left' | 'right' = 'left') {
  return ({ column }: { column: Column<typeof features, PickResult, unknown> }) => {
    const sorted = column.getIsSorted()
    const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
    return (
      <button
        type="button"
        onClick={() => column.toggleSorting(sorted === 'desc' ? false : true)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-bold tracking-wide uppercase transition-colors hover:text-foreground',
          sorted ? 'text-foreground' : 'text-muted-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon className={cn('size-3', sorted ? 'text-primary' : 'text-muted-foreground/60')} />
      </button>
    )
  }
}

const columns = [
  columnHelper.display({
    id: 'event',
    enableSorting: false,
    header: 'Event',
    cell: ({ row }) => {
      const { event } = row.original
      return (
        <div className="flex items-center gap-1.5">
          <TeamBadge
            className="size-6 shrink-0 rounded-md"
            team={{ name: event.teamAName, logoUrl: event.teamALogoUrl, color: event.teamAColor, record: null }}
          />
          <span className="max-w-28 truncate font-semibold">{event.teamAName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">vs.</span>
          <TeamBadge
            className="size-6 shrink-0 rounded-md"
            team={{ name: event.teamBName, logoUrl: event.teamBLogoUrl, color: event.teamBColor, record: null }}
          />
          <span className="max-w-28 truncate font-semibold">{event.teamBName}</span>
        </div>
      )
    },
  }),
  columnHelper.display({
    id: 'date',
    enableSorting: true,
    header: sortableHeader('Date'),
    cell: ({ row }) => formatDate(row.original.event.startTime),
  }),
  columnHelper.display({
    id: 'yourPick',
    enableSorting: false,
    header: 'Your pick',
    cell: ({ row }) => {
      const result = row.original
      return (
        <>
          <div>{pickDescription(result)}</div>
          <div className="text-xs text-muted-foreground">{MARKET_LABEL[result.market.marketType]}</div>
        </>
      )
    },
  }),
  columnHelper.display({
    id: 'odds',
    enableSorting: true,
    header: sortableHeader('Odds'),
    cell: ({ row }) => formatOdds(row.original.pick.priceAtPick),
  }),
  columnHelper.display({
    id: 'score',
    enableSorting: false,
    header: 'Score',
    cell: ({ row }) => formatFinalScore(row.original) ?? '—',
  }),
  columnHelper.display({
    id: 'result',
    enableSorting: false,
    header: 'Result',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge className={cn('border-transparent font-bold tracking-wide uppercase', STATUS_CLASS[status])}>
          {STATUS_LABEL[status]}
        </Badge>
      )
    },
  }),
  columnHelper.display({
    id: 'points',
    enableSorting: true,
    header: sortableHeader('Points', 'right'),
    cell: ({ row }) => {
      const points = row.original.points
      return points === null ? '—' : formatPoints(points)
    },
  }),
]

const COLUMN_WIDTHS = [undefined, 90, 160, 70, 80, 100, 90]

export function PicksTable({
  picks,
  search,
  onSort,
}: {
  picks: PickResult[]
  search: MyPicksSearch
  onSort: (field: SortField) => void
}) {
  const sorting = useMemo<SortingState>(
    () => [{ id: search.sortBy ?? 'date', desc: (search.sortDir ?? 'desc') === 'desc' }],
    [search.sortBy, search.sortDir],
  )

  const table = useTable({
    features,
    data: picks,
    columns,
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const nextSort = next[0]
      if (nextSort) onSort(nextSort.id as SortField)
    },
  })

  return (
    <Table>
      <colgroup>
        {COLUMN_WIDTHS.map((width, i) => (
          <col key={i} style={width ? { width } : undefined} />
        ))}
      </colgroup>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header, i) => (
              <TableHead
                key={header.id}
                className={cn(
                  'h-auto py-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase',
                  i === 0 && 'pl-4',
                  i === headerGroup.headers.length - 1 && 'pr-4 text-right',
                )}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const result = row.original
          const cells = row.getAllCells()
          return (
            <TableRow key={row.id}>
              {cells.map((cell, i) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    'py-3 whitespace-normal',
                    i === 0 && 'pl-4 text-left',
                    cell.column.id === 'date' && 'text-left text-sm text-muted-foreground',
                    cell.column.id === 'score' && 'text-left font-mono text-sm tabular-nums text-muted-foreground',
                    cell.column.id === 'odds' && 'text-left font-mono text-sm tabular-nums text-muted-foreground',
                    cell.column.id === 'points' &&
                      cn(
                        'pr-4 text-right font-mono tabular-nums',
                        result.points === null ? 'text-muted-foreground' : result.points >= 0 ? 'text-win' : 'text-loss',
                      ),
                  )}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
