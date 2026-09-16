import { EventRow, MarketColumnHeaders } from "@/components/picks/event-row"
import { LeagueRail } from "@/components/picks/league-rail"
import { PickSlip } from "@/components/picks/pick-slip"
import { useMarkets } from "@/hooks/usePicks"
import { StagingProvider } from "@/hooks/usePicksStaging"
import type { EventWithMarkets } from "@/lib/api"

function groupByDate(events: EventWithMarkets[]): { label: string; events: EventWithMarkets[] }[] {
  const groups = new Map<string, EventWithMarkets[]>()
  for (const e of events) {
    const label = new Date(e.event.startTime).toLocaleDateString(undefined, {
      weekday: "short",
      month: "long",
      day: "numeric",
    })
    const list = groups.get(label) ?? []
    list.push(e)
    groups.set(label, list)
  }
  return [...groups.entries()].map(([label, events]) => ({ label, events }))
}

// Backs both /sports/$sport (all leagues in a sport) and /sports/$sport/$league
// (one league) — the two routes differ only in which league ids they pass in.
export function SportView({
  title,
  leagueIds,
  selectedLeague,
}: {
  title: string
  leagueIds: readonly string[]
  selectedLeague?: string
}) {
  const { data, isPending, isError } = useMarkets()

  const allEvents = data?.events ?? []
  const events = allEvents.filter((e) => leagueIds.includes(e.event.leagueId))
  const groups = groupByDate(events)

  return (
    <StagingProvider>
      <div className="mx-auto w-full max-w-[90rem] px-4 py-8">
        <h1 className="mt-0 mb-6 text-2xl font-medium">{title}</h1>
        <div className="grid grid-cols-[220px_minmax(0,1fr)_380px] items-start gap-5 max-lg:grid-cols-1">
          <LeagueRail events={allEvents} selectedLeague={selectedLeague} />

          <div>
            {isPending ? <p className="text-sm text-muted-foreground">Loading markets…</p> : null}
            {isError ? <p className="text-sm text-destructive">Couldn't load markets. Try refreshing.</p> : null}
            {!isPending && !isError && events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open games right now. Check back closer to game time.</p>
            ) : null}
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <MarketColumnHeaders label={group.label} />
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
