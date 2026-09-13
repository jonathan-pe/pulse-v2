import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalibrationGauge } from '@/components/picks/calibration-gauge'
import { EventRow, MarketColumnHeaders } from '@/components/picks/event-row'
import { PickSlip } from '@/components/picks/pick-slip'
import { StagingProvider } from '@/hooks/usePicksStaging'
import { useAuth } from '@/hooks/useAuth'
import { useAllMyPicks, useMarkets } from '@/hooks/usePicks'
import { useLeagueDirectory, type LeagueDirectoryEntry, type SportGroup } from '@/hooks/useLeagueDirectory'
import { cn } from '@/lib/utils'
import { compactVolume } from '@/lib/format'
import { formatPoints, summarizePicks } from '@/lib/picks-summary'
import type { EventWithMarkets } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const POPULAR_LIMIT = 6
const SPOTLIGHT_LIMIT = 6

function popularEvents(events: EventWithMarkets[]): EventWithMarkets[] {
  return [...events].sort((a, b) => Number(b.event.volume) - Number(a.event.volume)).slice(0, POPULAR_LIMIT)
}

// One merged "what's happening" rail rather than a separate Trending row and
// Your Leagues row — leagues you actually have a settled record in surface
// that record (the more useful signal once you have one), everything else
// falls back to market volume. Favorites first: personal relevance beats
// raw volume.
function spotlightLeagues(sportGroups: SportGroup[]): LeagueDirectoryEntry[] {
  const all = sportGroups.flatMap((g) => g.leagues)
  const hasRecord = (e: LeagueDirectoryEntry) => !!e.record && e.record.won + e.record.lost > 0
  const favorites = all.filter(hasRecord).sort((a, b) => b.record!.won + b.record!.lost - (a.record!.won + a.record!.lost))
  const rest = all.filter((e) => !hasRecord(e)).sort((a, b) => b.volume - a.volume)
  return [...favorites, ...rest].slice(0, SPOTLIGHT_LIMIT)
}

function HomeComponent() {
  const { user, isPending: isAuthPending } = useAuth()
  const { data: marketsData, isPending: isMarketsPending, isError: isMarketsError } = useMarkets()
  const { data: picksData } = useAllMyPicks({ enabled: !!user })
  const sportGroups = useLeagueDirectory()

  const events = marketsData?.events ?? []
  const picks = picksData?.picks ?? []
  const spotlight = spotlightLeagues(sportGroups)
  const record = summarizePicks(picks)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {!isAuthPending && !user ? (
        <div className="mb-10 grid grid-cols-[1.1fr_0.9fr] items-center gap-6 rounded-2xl border border-border bg-card p-6 max-lg:grid-cols-1">
          <div>
            <div className="mb-2 font-mono text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Free · every game · every week
            </div>
            <h2 className="mb-2 font-heading text-[28px] leading-[1.15] font-semibold text-foreground">
              Being right isn't enough.
              <br />
              Being sure counts too.
            </h2>
            <p className="mb-4 max-w-[42ch] text-sm text-muted-foreground">
              Every pick scores on points won and on how well your confidence matched reality — call a coin flip a
              lock, and it costs you, even if you're right.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button render={<Link to="/sign-up" />}>Sign up</Button>
              <Button variant="outline" render={<Link to="/sign-in" />}>
                Sign in
              </Button>
            </div>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="mb-3 font-mono text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              Your calibration — example
            </div>
            <CalibrationGauge brierScore={0.14} caption="Top 18% last week" />
          </div>
        </div>
      ) : null}

      {spotlight.length > 0 ? (
        <div className="mb-10">
          <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">What's moving</div>
          <div className="flex flex-wrap gap-2.5">
            {spotlight.map(({ league, volume, record: leagueRecord }) => (
              <Link
                key={league.id}
                to="/sports/$sport/$league"
                params={{ sport: league.sport, league: league.id }}
                className="flex min-w-[112px] flex-col gap-0.5 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-foreground/10 transition-colors hover:ring-primary/40"
              >
                <span className="text-sm font-semibold">{league.label}</span>
                {leagueRecord && leagueRecord.won + leagueRecord.lost > 0 ? (
                  <span className="font-mono text-xs tabular-nums">
                    <span className={leagueRecord.won >= leagueRecord.lost ? 'text-win' : 'text-loss'}>
                      {leagueRecord.won}–{leagueRecord.lost}
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

      {isMarketsPending || isMarketsError || events.length === 0 ? (
        <div className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Popular</div>
      ) : null}
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
              <MarketColumnHeaders label="Popular" />
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
    </div>
  )
}
