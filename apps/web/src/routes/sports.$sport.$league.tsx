import { createFileRoute, notFound } from '@tanstack/react-router'
import { SportView } from '@/components/picks/sport-view'
import { findLeague } from '@/lib/sports'

export const Route = createFileRoute('/sports/$sport/$league')({
  beforeLoad: ({ params }) => {
    const league = findLeague(params.league)
    if (!league || league.sport !== params.sport) {
      throw notFound()
    }
  },
  component: LeaguePage,
})

function LeaguePage() {
  const { league } = Route.useParams()
  const leagueData = findLeague(league)!

  return <SportView title={leagueData.label} leagueIds={[league]} selectedLeague={league} />
}
