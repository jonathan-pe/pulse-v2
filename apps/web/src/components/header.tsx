import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut, Search, Ticket } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { useAuth } from '@/hooks/useAuth'

// The only event category today; a stand-in for the row Polymarket uses to
// switch between Politics/Crypto/Sports/etc. once Pulse covers more than sports.
const EVENT_CATEGORIES = [{ label: 'Sports', to: '/' as const }]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const chars = parts.length > 1 ? [parts[0]![0], parts.at(-1)![0]] : [parts[0]?.[0] ?? '?']
  return chars.join('').toUpperCase()
}

export function Header() {
  const { user, isPending, signOut } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-heading text-xl font-medium">
          <Logo className="size-7" />
          Pulse
        </Link>

        <div className="relative mx-auto w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input disabled placeholder="Search Pulse… (coming soon)" className="pl-9 text-base" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isPending ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button type="button" className="rounded-full outline-offset-2">
                    <Avatar>
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
                    <span className="font-semibold">{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/picks" />}>
                  <Ticket />
                  My Picks
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" render={<Link to="/sign-in" />}>
                Sign in
              </Button>
              <Button render={<Link to="/sign-up" />}>Sign up</Button>
            </>
          )}
        </div>
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center gap-5 px-4 py-2">
        {EVENT_CATEGORIES.map((category) => (
          <Link
            key={category.to}
            to={category.to}
            className={
              pathname.startsWith(category.to)
                ? 'text-base font-semibold text-foreground'
                : 'text-base font-semibold text-muted-foreground hover:text-foreground'
            }
          >
            {category.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
