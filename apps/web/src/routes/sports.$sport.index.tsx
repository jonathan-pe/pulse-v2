import { createFileRoute } from '@tanstack/react-router'
import { SportView } from '@/components/picks/sport-view'
import { LEAGUES, SPORTS } from '@/lib/sports'

export const Route = createFileRoute('/sports/$sport/')({
  component: SportPage,
})

function SportPage() {
  const { sport } = Route.useParams()
  const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? sport
  const leagueIds = LEAGUES.filter((l) => l.sport === sport).map((l) => l.id)

  return <SportView title={sportLabel} leagueIds={leagueIds} />
}
