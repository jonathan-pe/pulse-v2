import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { user, isPending, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <Link to="/" className="font-heading text-lg font-medium">
        Pulse
      </Link>
      {isPending ? null : user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link to="/sign-in" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link to="/sign-up" />}>
            Sign up
          </Button>
        </div>
      )}
    </header>
  )
}
