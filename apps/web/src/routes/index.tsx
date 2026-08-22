import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EventRow } from '@/components/picks/event-row'
import { PickSlip } from '@/components/picks/pick-slip'
import { StagingProvider } from '@/hooks/usePicksStaging'
import { useAuth } from '@/hooks/useAuth'
import { useMarkets, useMyPicks } from '@/hooks/usePicks'
import { cn } from '@/lib/utils'
import { findLeague, LEAGUES, SPORTS } from '@/lib/sports'
import { formatPoints, summarizePicks } from '@/lib/picks-summary'
import type { EventWithMarkets, PickResult } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const POPULAR_LIMIT = 6
const SPOTLIGHT_LIMIT = 6

function popularEvents(events: EventWithMarkets[]): EventWithMarkets[] {
  return [...events].sort((a, b) => Number(b.event.volume) - Number(a.event.volume)).slice(0, POPULAR_LIMIT)
}

const compactVolume = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 1,
})

type LeagueRecord = { won: number; lost: number }
type SpotlightLeague = { league: NonNullable<ReturnType<typeof findLeague>>; volume: number; record: LeagueRecord | null }

// One merged "what's happening" rail rather than a separate Trending row and
// Your Leagues row — leagues you actually pick in surface your record there
// (the more useful signal once you have one), everything else falls back to
// market volume. Favorites first: personal relevance beats raw volume.
function spotlightLeagues(events: EventWithMarkets[], picks: PickResult[]): SpotlightLeague[] {
  const volumeByLeague = new Map<string, number>()
  for (const e of events) {
    volumeByLeague.set(e.event.leagueId, (volumeByLeague.get(e.event.leagueId) ?? 0) + Number(e.event.volume))
  }

  const recordByLeague = new Map<string, LeagueRecord>()
  const pickCounts = new Map<string, number>()
  for (const p of picks) {
    pickCounts.set(p.event.leagueId, (pickCounts.get(p.event.leagueId) ?? 0) + 1)
    const entry = recordByLeague.get(p.event.leagueId) ?? { won: 0, lost: 0 }
    if (p.status === 'won') entry.won += 1
    if (p.status === 'lost') entry.lost += 1
    recordByLeague.set(p.event.leagueId, entry)
  }

  const favoriteIds = [...pickCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const trendingIds = [...volumeByLeague.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const orderedIds = [...new Set([...favoriteIds, ...trendingIds])].slice(0, SPOTLIGHT_LIMIT)

  return orderedIds
    .map((id) => {
      const league = findLeague(id)
      if (!league) return null
      return { league, volume: volumeByLeague.get(id) ?? 0, record: recordByLeague.get(id) ?? null }
    })
    .filter((entry): entry is SpotlightLeague => !!entry)
}

function HomeComponent() {
  const { user, isPending: isAuthPending } = useAuth()
  const { data: marketsData, isPending: isMarketsPending, isError: isMarketsError } = useMarkets()
  const { data: picksData } = useMyPicks({ enabled: !!user })

  const events = marketsData?.events ?? []
  const picks = picksData?.picks ?? []
  const spotlight = spotlightLeagues(events, picks)

  const counts = new Map<string, number>()
  const volumeBySport = new Map<string, number>()
  for (const e of events) {
    counts.set(e.event.leagueId, (counts.get(e.event.leagueId) ?? 0) + 1)
    const league = findLeague(e.event.leagueId)
    if (league) volumeBySport.set(league.sport, (volumeBySport.get(league.sport) ?? 0) + Number(e.event.volume))
  }
  const activeSports = SPORTS.map((sport) => ({
    sport,
    leagues: LEAGUES.filter((l) => l.sport === sport.id && (counts.get(l.id) ?? 0) > 0),
  })).filter(({ leagues }) => leagues.length > 0)

  const record = summarizePicks(picks)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {!isAuthPending && !user ? (
        <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 font-mono text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Free · every game · every week
            </div>
            <h2 className="mb-1 font-heading text-2xl font-semibold text-foreground">Pick winners.</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Points for calling it right, plus a calibration score that keeps you honest about how sure you really
              were.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button render={<Link to="/sign-up" />}>Sign up</Button>
            <Button variant="outline" render={<Link to="/sign-in" />}>
              Sign in
            </Button>
          </div>
        </div>
      ) : null}

      {spotlight.length > 0 ? (
        <div className="mb-10">
          <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">What's moving</div>
          <div className="flex flex-wrap gap-2.5">
            {spotlight.map(({ league, volume, record }) => (
              <Link
                key={league.id}
                to="/sports/$sport/$league"
                params={{ sport: league.sport, league: league.id }}
                className="flex min-w-[112px] flex-col gap-0.5 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-foreground/10 transition-colors hover:ring-primary/40"
              >
                <span className="text-sm font-semibold">{league.label}</span>
                {record && record.won + record.lost > 0 ? (
                  <span className="font-mono text-xs tabular-nums">
                    <span className={record.won >= record.lost ? 'text-win' : 'text-loss'}>
                      {record.won}–{record.lost}
                    </span>{' '}
                    <span className="text-muted-foreground">record</span>
                  </span>
                ) : (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {compactVolume.format(volume)} vol
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {user && picks.length === 0 ? (
        <p className="mb-10 text-sm text-muted-foreground">
          No picks yet — the popular games below are a good place to start.
        </p>
      ) : null}

      <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Popular</div>
      {isMarketsPending ? (
        <div className="mb-10 flex flex-col gap-2.5">
          {Array.from({ length: POPULAR_LIMIT }, (_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton className="h-4 w-12 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-7 w-24 shrink-0" />
              <Skeleton className="h-7 w-24 shrink-0" />
              <Skeleton className="h-7 w-24 shrink-0" />
            </div>
          ))}
        </div>
      ) : null}
      {isMarketsError ? <p className="mb-10 text-sm text-destructive">Couldn't load markets. Try refreshing.</p> : null}
      {!isMarketsPending && !isMarketsError && events.length === 0 ? (
        <p className="mb-10 text-sm text-muted-foreground">No open games right now. Check back closer to game time.</p>
      ) : null}
      {events.length > 0 ? (
        <StagingProvider>
          <div className="mb-12 grid grid-cols-[minmax(0,1fr)_296px] items-start gap-5 max-lg:grid-cols-1">
            <div>
              {popularEvents(events).map((e) => (
                <EventRow key={e.event.id} data={e} />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {user && picks.length > 0 ? (
                <Card size="sm">
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="mb-1 font-mono text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                        Your record
                      </div>
                      <div className="font-heading text-xl font-semibold">
                        {record.won}–{record.lost}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'font-mono text-lg font-semibold tabular-nums',
                        record.totalPoints >= 0 ? 'text-primary' : 'text-destructive',
                      )}
                    >
                      {formatPoints(record.totalPoints)} <span className="text-xs font-medium text-muted-foreground">pts</span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <PickSlip />
            </div>
          </div>
        </StagingProvider>
      ) : null}

      {activeSports.length > 0 ? (
        <>
          <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Browse by sport</div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {activeSports.map(({ sport, leagues }) => (
              <Card key={sport.id} hoverable={leagues.length > 1}>
                <CardHeader>
                  <CardTitle>
                    {leagues.length > 1 ? (
                      <Link to="/sports/$sport" params={{ sport: sport.id }} className="hover:underline">
                        {sport.label}
                      </Link>
                    ) : (
                      sport.label
                    )}
                  </CardTitle>
                  <CardAction className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
                    {compactVolume.format(volumeBySport.get(sport.id) ?? 0)}
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5">
                  {leagues.map((l) => (
                    <Link
                      key={l.id}
                      to="/sports/$sport/$league"
                      params={{ sport: l.sport, league: l.id }}
                      className="flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <span>{l.label}</span>
                      <span className="font-mono text-xs tabular-nums">{counts.get(l.id)}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
