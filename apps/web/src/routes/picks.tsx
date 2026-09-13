import { createFileRoute, redirect } from '@tanstack/react-router'
import { Inbox, SearchX } from 'lucide-react'
import { useMyPicks } from '@/hooks/usePicks'
import { authClient } from '@/lib/auth-client'
import { PicksStatsRow } from '@/components/picks/picks-stats'
import { PicksFilterBar } from '@/components/picks/picks-filter-bar'
import { PicksTable } from '@/components/picks/picks-table'
import { PicksPagination } from '@/components/picks/picks-pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { validateMyPicksSearch, type MyPicksSearch, type SortField } from '@/lib/picks-search'

export const Route = createFileRoute('/picks')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  validateSearch: validateMyPicksSearch,
  component: MyPicksPage,
})

function MyPicksPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, isPending, isError } = useMyPicks(search)
  const picks = data?.picks ?? []

  function patchSearch(patch: Partial<MyPicksSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) })
  }

  function handleSort(field: SortField) {
    patchSearch({
      sortBy: field,
      sortDir: search.sortBy === field && search.sortDir === 'desc' ? 'asc' : 'desc',
      page: 1,
    })
  }

  const hasAnyPicksAtAll = !isPending && data && data.total === 0 && !search.league && !search.marketType && !search.status && !search.from && !search.to

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-10">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">My Picks</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your full record across every market you've picked.</p>
      </div>

      {isPending ? <PicksLoadingSkeleton /> : null}

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn't load picks. Try refreshing.
        </div>
      ) : null}

      {hasAnyPicksAtAll ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="size-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No picks yet — head to a league and pick your first game.</p>
        </div>
      ) : null}

      {data && !hasAnyPicksAtAll ? (
        <>
          <PicksStatsRow stats={data.stats} />
          <PicksFilterBar search={search} onChange={patchSearch} />

          {data.total === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
              <SearchX className="size-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">No picks match these filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <PicksTable picks={picks} search={search} onSort={handleSort} />
              <PicksPagination page={data.page} limit={data.limit} total={data.total} onPageChange={(page) => patchSearch({ page })} />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function PicksLoadingSkeleton() {
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-18 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-4 h-11 rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-none border-b border-border last:border-b-0" />
        ))}
      </div>
    </div>
  )
}
