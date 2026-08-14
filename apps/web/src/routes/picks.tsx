import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { EventRow } from '@/components/picks/event-row'
import { LEAGUES, LeagueRail } from '@/components/picks/league-rail'
import { PickSlip } from '@/components/picks/pick-slip'
import { useMarkets } from '@/hooks/usePicks'
import { StagingProvider } from '@/hooks/usePicksStaging'
import { authClient } from '@/lib/auth-client'
import type { EventWithMarkets } from '@/lib/api'

export const Route = createFileRoute('/picks')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: PicksPage,
})

function groupByDate(events: EventWithMarkets[]): { label: string; events: EventWithMarkets[] }[] {
  const groups = new Map<string, EventWithMarkets[]>()
  for (const e of events) {
    const label = new Date(e.event.startTime).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    })
    const list = groups.get(label) ?? []
    list.push(e)
    groups.set(label, list)
  }
  return [...groups.entries()].map(([label, events]) => ({ label, events }))
}

function PicksPage() {
  const [league, setLeague] = useState<string>(LEAGUES[0].id)
  const { data, isPending, isError } = useMarkets()

  const allEvents = data?.events ?? []
  const events = allEvents.filter((e) => e.event.leagueId === league)
  const groups = groupByDate(events)

  return (
    <StagingProvider>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-medium">Make Picks</h1>
        <div className="grid grid-cols-[176px_minmax(0,1fr)_296px] items-start gap-5 max-lg:grid-cols-1">
          <LeagueRail events={allEvents} selected={league} onSelect={setLeague} />

          <div>
            {isPending ? <p className="text-sm text-muted-foreground">Loading markets…</p> : null}
            {isError ? <p className="text-sm text-destructive">Couldn't load markets. Try refreshing.</p> : null}
            {!isPending && !isError && events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open games for this league right now.</p>
            ) : null}
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="mb-2.5 px-0.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </div>
                {group.events.map((e) => (
                  <EventRow key={e.event.id} data={e} />
                ))}
              </div>
            ))}
          </div>

          <PickSlip />
        </div>
      </div>
    </StagingProvider>
  )
}
