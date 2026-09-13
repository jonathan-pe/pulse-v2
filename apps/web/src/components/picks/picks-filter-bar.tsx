import { ListFilter, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LEAGUES } from '@/lib/sports'
import type { PickOutcomeStatus } from '@/lib/api'
import type { MarketType, MyPicksSearch } from '@/lib/picks-search'

const STATUS_OPTIONS: { value: PickOutcomeStatus; label: string; dotClass: string }[] = [
  { value: 'won', label: 'Won', dotClass: 'bg-win' },
  { value: 'lost', label: 'Lost', dotClass: 'bg-loss' },
  { value: 'pending', label: 'Pending', dotClass: 'bg-ember' },
  { value: 'upcoming', label: 'Upcoming', dotClass: 'bg-muted-foreground' },
]

function StatusLabel({ option }: { option: (typeof STATUS_OPTIONS)[number] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-1.5 shrink-0 rounded-full', option.dotClass)} />
      {option.label}
    </span>
  )
}

const MARKET_TYPE_OPTIONS: { value: MarketType; label: string }[] = [
  { value: 'moneyline', label: 'Moneyline' },
  { value: 'spreads', label: 'Spread' },
  { value: 'totals', label: 'Total' },
]

const ALL = '__all__'

const LEAGUE_LABELS: Record<string, string> = Object.fromEntries(LEAGUES.map((l) => [l.id, l.label]))
const MARKET_TYPE_LABELS: Record<string, string> = Object.fromEntries(MARKET_TYPE_OPTIONS.map((o) => [o.value, o.label]))
const STATUS_BY_VALUE: Record<string, (typeof STATUS_OPTIONS)[number]> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o]))

export function PicksFilterBar({
  search,
  onChange,
}: {
  search: MyPicksSearch
  onChange: (patch: Partial<MyPicksSearch>) => void
}) {
  const hasActiveFilters = Boolean(search.league || search.marketType || search.status || search.from || search.to)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
      <div className="flex items-center gap-1.5 pr-1 pl-1.5 text-muted-foreground">
        <ListFilter className="size-3.5" strokeWidth={2.25} />
        <span className="font-mono text-xs font-bold tracking-wide uppercase">Filter</span>
      </div>

      <Select
        value={search.league ?? ALL}
        onValueChange={(value) => onChange({ league: value === ALL ? undefined : (value as string), page: 1 })}
      >
        <SelectTrigger size="sm" className="bg-card" aria-label="Filter by sport">
          <SelectValue>{(value: string) => LEAGUE_LABELS[value] ?? 'All sports'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sports</SelectItem>
          {LEAGUES.map((league) => (
            <SelectItem key={league.id} value={league.id}>
              {league.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.marketType ?? ALL}
        onValueChange={(value) => onChange({ marketType: value === ALL ? undefined : (value as MarketType), page: 1 })}
      >
        <SelectTrigger size="sm" className="bg-card" aria-label="Filter by market type">
          <SelectValue>{(value: string) => MARKET_TYPE_LABELS[value] ?? 'All markets'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All markets</SelectItem>
          {MARKET_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.status ?? ALL}
        onValueChange={(value) => onChange({ status: value === ALL ? undefined : (value as PickOutcomeStatus), page: 1 })}
      >
        <SelectTrigger size="sm" className="bg-card" aria-label="Filter by result">
          <SelectValue>
            {(value: string) => {
              const option = STATUS_BY_VALUE[value]
              return option ? <StatusLabel option={option} /> : 'All results'
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All results</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <StatusLabel option={option} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-0.5">
        <Input
          type="date"
          value={search.from ?? ''}
          onChange={(e) => onChange({ from: e.target.value || undefined, page: 1 })}
          className="h-6 w-30 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          aria-label="From date"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="date"
          value={search.to ?? ''}
          onChange={(e) => onChange({ to: e.target.value || undefined, page: 1 })}
          className="h-6 w-30 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          aria-label="To date"
        />
      </div>

      {hasActiveFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={() => onChange({ league: undefined, marketType: undefined, status: undefined, from: undefined, to: undefined, page: 1 })}
        >
          <X data-icon="inline-start" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
