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
    <nav className="rounded-xl bg-card p-2 shadow-sm">
      <div className="mb-1 px-2.5 pt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        Leagues
      </div>
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
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-semibold transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{l.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-xs tabular-nums",
                  isSelected ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
