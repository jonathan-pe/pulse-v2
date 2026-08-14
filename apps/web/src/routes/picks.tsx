import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventCard } from '@/components/picks/event-card'
import { useMarkets } from '@/hooks/usePicks'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/picks')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: PicksPage,
})

const LEAGUES = [
  { id: 'nba', label: 'NBA' },
  { id: 'nfl', label: 'NFL' },
  { id: 'nhl', label: 'NHL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'wnba', label: 'WNBA' },
] as const

function PicksPage() {
  const [league, setLeague] = useState<string>(LEAGUES[0].id)
  const { data, isPending, isError } = useMarkets()

  const events = (data?.events ?? []).filter((e) => e.event.leagueId === league)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-medium">Make Picks</h1>
      <Tabs value={league} onValueChange={(value) => setLeague(String(value))}>
        <TabsList>
          {LEAGUES.map((l) => (
            <TabsTrigger key={l.id} value={l.id}>
              {l.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="mt-6 flex flex-col gap-4">
        {isPending ? <p className="text-sm text-muted-foreground">Loading markets…</p> : null}
        {isError ? <p className="text-sm text-destructive">Couldn't load markets. Try refreshing.</p> : null}
        {!isPending && !isError && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games in the next two weeks for this league.</p>
        ) : null}
        {events.map((e) => (
          <EventCard key={e.event.id} data={e} />
        ))}
      </div>
    </div>
  )
}
