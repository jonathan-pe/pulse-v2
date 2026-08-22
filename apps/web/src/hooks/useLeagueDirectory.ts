import { useAuth } from "@/hooks/useAuth"
import { useMarkets, useMyPicks } from "@/hooks/usePicks"
import { LEAGUES, SPORTS, type League, type Sport } from "@/lib/sports"

export interface LeagueDirectoryEntry {
  league: League
  volume: number
  record: { won: number; lost: number } | null
}

export interface SportGroup {
  sport: Sport
  leagues: LeagueDirectoryEntry[]
}

// Single source of truth for "which leagues are open right now, and what do
// we know about them" — the header nav directory and the home page's
// spotlight rail both derive from this rather than each recomputing volume
// and record maps from raw events/picks.
export function useLeagueDirectory(): SportGroup[] {
  const { user } = useAuth()
  const { data: marketsData } = useMarkets()
  const { data: picksData } = useMyPicks({ enabled: !!user })

  const events = marketsData?.events ?? []
  const picks = picksData?.picks ?? []

  const volumeByLeague = new Map<string, number>()
  const countByLeague = new Map<string, number>()
  for (const e of events) {
    volumeByLeague.set(e.event.leagueId, (volumeByLeague.get(e.event.leagueId) ?? 0) + Number(e.event.volume))
    countByLeague.set(e.event.leagueId, (countByLeague.get(e.event.leagueId) ?? 0) + 1)
  }

  const recordByLeague = new Map<string, { won: number; lost: number }>()
  for (const p of picks) {
    const entry = recordByLeague.get(p.event.leagueId) ?? { won: 0, lost: 0 }
    if (p.status === "won") entry.won += 1
    if (p.status === "lost") entry.lost += 1
    recordByLeague.set(p.event.leagueId, entry)
  }

  return SPORTS.map((sport) => ({
    sport,
    leagues: LEAGUES.filter((l) => l.sport === sport.id && (countByLeague.get(l.id) ?? 0) > 0).map((league) => ({
      league,
      volume: volumeByLeague.get(league.id) ?? 0,
      record: recordByLeague.get(league.id) ?? null,
    })),
  })).filter((group): group is SportGroup => group.leagues.length > 0)
}
