import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useMarkets } from '@/hooks/usePicks'
import { LEAGUES, SPORTS } from '@/lib/sports'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const { user, isPending: isAuthPending } = useAuth()
  const { data, isPending: isMarketsPending, isError } = useMarkets({ enabled: !!user })

  const counts = new Map<string, number>()
  for (const e of data?.events ?? []) {
    counts.set(e.event.leagueId, (counts.get(e.event.leagueId) ?? 0) + 1)
  }

  const activeSports = SPORTS.map((sport) => ({
    sport,
    leagues: LEAGUES.filter((l) => l.sport === sport.id && (counts.get(l.id) ?? 0) > 0),
  })).filter(({ leagues }) => leagues.length > 0)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-medium">{user ? `Welcome back, ${user.name}` : 'Pulse'}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Pick outcomes on real sports markets and get scored on points and calibration.
      </p>

      {!isAuthPending && !user ? (
        <div className="flex items-center gap-2">
          <Button size="sm" render={<Link to="/sign-up" />}>
            Sign up
          </Button>
          <Button variant="outline" size="sm" render={<Link to="/sign-in" />}>
            Sign in
          </Button>
          <span className="text-sm text-muted-foreground">to start making picks.</span>
        </div>
      ) : null}

      {user && isMarketsPending ? <p className="text-sm text-muted-foreground">Loading markets…</p> : null}
      {user && isError ? <p className="text-sm text-destructive">Couldn't load markets. Try refreshing.</p> : null}
      {user && !isMarketsPending && !isError && activeSports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open games right now — check back soon.</p>
      ) : null}

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
    </div>
  )
}
