import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventRow } from '@/components/picks/event-row'
import { PickSlip } from '@/components/picks/pick-slip'
import { StagingProvider } from '@/hooks/usePicksStaging'
import { useAuth } from '@/hooks/useAuth'
import { useMarkets, useMyPicks } from '@/hooks/usePicks'
import { findLeague, LEAGUES, SPORTS } from '@/lib/sports'
import type { EventWithMarkets, PickResult } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const POPULAR_LIMIT = 6
const FAVORITE_LEAGUES_LIMIT = 3
const TRENDING_LEAGUES_LIMIT = 5

function popularEvents(events: EventWithMarkets[]): EventWithMarkets[] {
  return [...events].sort((a, b) => Number(b.event.volume) - Number(a.event.volume)).slice(0, POPULAR_LIMIT)
}

// Ranks leagues by total open-event volume so the top-of-page header reflects
// what's actually trading right now instead of a hardcoded league list.
function trendingLeagues(events: EventWithMarkets[]) {
  const volumeByLeague = new Map<string, number>()
  for (const e of events) {
    volumeByLeague.set(e.event.leagueId, (volumeByLeague.get(e.event.leagueId) ?? 0) + Number(e.event.volume))
  }
  return [...volumeByLeague.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TRENDING_LEAGUES_LIMIT)
    .map(([leagueId, volume]) => ({ league: findLeague(leagueId), volume }))
    .filter((entry): entry is { league: NonNullable<ReturnType<typeof findLeague>>; volume: number } => !!entry.league)
}

const compactVolume = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 1,
})

// Which leagues a user actually picks in, not which they browse — a proxy
// for interest that needs no new schema or manual favoriting UI.
function favoriteLeagues(picks: PickResult[]) {
  const counts = new Map<string, number>()
  for (const p of picks) {
    counts.set(p.event.leagueId, (counts.get(p.event.leagueId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, FAVORITE_LEAGUES_LIMIT)
    .map(([leagueId, count]) => ({ league: findLeague(leagueId), count }))
    .filter((entry): entry is { league: NonNullable<ReturnType<typeof findLeague>>; count: number } => !!entry.league)
}

function HomeComponent() {
  const { user, isPending: isAuthPending } = useAuth()
  const { data: marketsData, isPending: isMarketsPending, isError: isMarketsError } = useMarkets()
  const { data: picksData } = useMyPicks({ enabled: !!user })

  const events = marketsData?.events ?? []
  const picks = picksData?.picks ?? []
  const favLeagues = favoriteLeagues(picks)
  const trending = trendingLeagues(events)

  const counts = new Map<string, number>()
  for (const e of events) {
    counts.set(e.event.leagueId, (counts.get(e.event.leagueId) ?? 0) + 1)
  }
  const activeSports = SPORTS.map((sport) => ({
    sport,
    leagues: LEAGUES.filter((l) => l.sport === sport.id && (counts.get(l.id) ?? 0) > 0),
  })).filter(({ leagues }) => leagues.length > 0)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {!isAuthPending && !user ? (
        <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-foreground">Pick winners. Get scored on more than wins.</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Free picks on real sports markets — points for what you got right, plus a calibration score for how
              well your confidence matched reality.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Free to play</span>
              <span aria-hidden="true">·</span>
              <span>Real market odds</span>
              <span aria-hidden="true">·</span>
              <span>Points + calibration scoring</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button render={<Link to="/sign-up" />}>Sign up</Button>
            <Button variant="outline" render={<Link to="/sign-in" />}>
              Sign in
            </Button>
          </div>
        </div>
      ) : null}

      {trending.length > 0 ? (
        <div className="mb-10">
          <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Trending</div>
          <div className="flex flex-wrap gap-2">
            {trending.map(({ league, volume }) => (
              <Link
                key={league.id}
                to="/sports/$sport/$league"
                params={{ sport: league.sport, league: league.id }}
                className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted"
              >
                {league.label}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                  {compactVolume.format(volume)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {user && picks.length === 0 ? (
        <p className="mb-10 text-sm text-muted-foreground">No picks yet — check out the popular games below.</p>
      ) : null}

      {user && favLeagues.length > 0 ? (
        <div className="mb-10">
          <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Your leagues</div>
          <div className="flex flex-wrap gap-2">
            {favLeagues.map(({ league, count }) => (
              <Link
                key={league.id}
                to="/sports/$sport/$league"
                params={{ sport: league.sport, league: league.id }}
                className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted"
              >
                {league.label}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                  {count} {count === 1 ? 'pick' : 'picks'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Popular</div>
      {isMarketsPending ? <p className="mb-10 text-sm text-muted-foreground">Loading markets…</p> : null}
      {isMarketsError ? <p className="mb-10 text-sm text-destructive">Couldn't load markets. Try refreshing.</p> : null}
      {!isMarketsPending && !isMarketsError && events.length === 0 ? (
        <p className="mb-10 text-sm text-muted-foreground">No open games right now — check back soon.</p>
      ) : null}
      {events.length > 0 ? (
        <StagingProvider>
          <div className="mb-12 grid grid-cols-[minmax(0,1fr)_296px] items-start gap-5 max-lg:grid-cols-1">
            <div>
              {popularEvents(events).map((e) => (
                <EventRow key={e.event.id} data={e} />
              ))}
            </div>
            <PickSlip />
          </div>
        </StagingProvider>
      ) : null}

      {activeSports.length > 0 ? (
        <>
          <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Browse by sport</div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {activeSports.map(({ sport, leagues }) => (
              <Card key={sport.id}>
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
