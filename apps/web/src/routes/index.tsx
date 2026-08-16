import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventRow } from '@/components/picks/event-row'
import { PickSlip } from '@/components/picks/pick-slip'
import { StagingProvider } from '@/hooks/usePicksStaging'
import { useAuth } from '@/hooks/useAuth'
import { useMarkets, useMyPicks } from '@/hooks/usePicks'
import { formatPoints, summarizePicks } from '@/lib/picks-summary'
import { findLeague, LEAGUES, SPORTS } from '@/lib/sports'
import type { EventWithMarkets, PickResult } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const POPULAR_LIMIT = 6
const FAVORITE_LEAGUES_LIMIT = 3

function popularEvents(events: EventWithMarkets[]): EventWithMarkets[] {
  return [...events].sort((a, b) => Number(b.event.volume) - Number(a.event.volume)).slice(0, POPULAR_LIMIT)
}

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
  const { totalPoints, won, lost } = summarizePicks(picks)
  const favLeagues = favoriteLeagues(picks)

  const counts = new Map<string, number>()
  for (const e of events) {
    counts.set(e.event.leagueId, (counts.get(e.event.leagueId) ?? 0) + 1)
  }
  const activeSports = SPORTS.map((sport) => ({
    sport,
    leagues: LEAGUES.filter((l) => l.sport === sport.id && (counts.get(l.id) ?? 0) > 0),
  })).filter(({ leagues }) => leagues.length > 0)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-medium">{user ? `Welcome back, ${user.name}` : 'Pulse'}</h1>
        {user && picks.length > 0 ? (
          <Link
            to="/picks"
            className="font-mono text-sm tabular-nums text-muted-foreground hover:text-foreground"
          >
            {won}–{lost}
            {' · '}
            <span className={totalPoints >= 0 ? 'text-primary' : 'text-destructive'}>{formatPoints(totalPoints)} pts</span>
          </Link>
        ) : null}
      </div>
      <p className="mb-8 text-sm text-muted-foreground">
        Pick outcomes on real sports markets and get scored on points and calibration.
      </p>

      {!isAuthPending && !user ? (
        <div className="mb-10 flex items-center gap-2">
          <Button size="sm" render={<Link to="/sign-up" />}>
            Sign up
          </Button>
          <Button variant="outline" size="sm" render={<Link to="/sign-in" />}>
            Sign in
          </Button>
          <span className="text-sm text-muted-foreground">to start making picks.</span>
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
