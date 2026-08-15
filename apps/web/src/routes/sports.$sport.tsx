import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { isSportId } from '@/lib/sports'

// Pathless layout for /sports/$sport and /sports/$sport/$league — browsing
// is public (GET /api/markets doesn't require a session either); the
// sport-id validation lives here so both children inherit it rather than
// duplicating it in the index route and the $league route.
export const Route = createFileRoute('/sports/$sport')({
  beforeLoad: ({ params }) => {
    if (!isSportId(params.sport)) {
      throw notFound()
    }
  },
  component: () => <Outlet />,
})
