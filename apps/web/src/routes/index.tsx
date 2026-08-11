import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const { user } = useAuth()

  return (
    <div className="p-4">
      <h1>{user ? `Welcome back, ${user.name}` : 'Pulse'}</h1>
    </div>
  )
}
