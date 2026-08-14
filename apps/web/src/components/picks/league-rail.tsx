import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { LEAGUES } from "@/lib/sports"
import type { EventWithMarkets } from "@/lib/api"

export function LeagueRail({
  events,
  selectedLeague,
}: {
  events: EventWithMarkets[]
  selectedLeague?: string
}) {
  const counts = new Map<string, number>()
  for (const e of events) {
    counts.set(e.event.leagueId, (counts.get(e.event.leagueId) ?? 0) + 1)
  }
  const activeLeagues = LEAGUES.filter((l) => (counts.get(l.id) ?? 0) > 0)

  return (
    <nav>
      <div className="mb-2 px-2.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Leagues</div>
      <div className="flex flex-col gap-0.5">
        {activeLeagues.map((l) => {
          const count = counts.get(l.id) ?? 0
          const isSelected = l.id === selectedLeague
          return (
            <Link
              key={l.id}
              to="/sports/$sport/$league"
              params={{ sport: l.sport, league: l.id }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{l.label}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
