import { createFileRoute, notFound, redirect, Outlet } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { isSportId } from '@/lib/sports'

// Pathless layout for /sports/$sport and /sports/$sport/$league — the auth
// guard and sport-id validation live here so both children inherit them,
// rather than being duplicated in the index route and the $league route.
export const Route = createFileRoute('/sports/$sport')({
  beforeLoad: async ({ params }) => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
    if (!isSportId(params.sport)) {
      throw notFound()
    }
  },
  component: () => <Outlet />,
})
