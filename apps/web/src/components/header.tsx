import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, LogOut, Search, Ticket } from 'lucide-react'
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
import { useLeagueDirectory } from '@/hooks/useLeagueDirectory'
import { cn } from '@/lib/utils'
import { compactVolume } from '@/lib/format'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const chars = parts.length > 1 ? [parts[0]![0], parts.at(-1)![0]] : [parts[0]?.[0] ?? '?']
  return chars.join('').toUpperCase()
}

// A dropdown directory rather than a plain "/sports" link — a stand-in for
// the row Polymarket uses to switch between Politics/Crypto/Sports/etc. once
// Pulse covers more than sports, but each league carries your record (or
// market volume if you haven't picked there) instead of being a bare link,
// so it's a personalized directory rather than a trending-markets feed.
function SportsNav() {
  const sportGroups = useLeagueDirectory()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = pathname === '/' || pathname.startsWith('/sports')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 text-base font-semibold transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Sports
            <ChevronDown className="size-3.5" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-80">
        {sportGroups.map(({ sport, leagues }, i) => (
          <DropdownMenuGroup key={sport.id}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{sport.label}</DropdownMenuLabel>
            {leagues.map(({ league, volume, record }) => {
              const hasRecord = !!record && record.won + record.lost > 0
              return (
                <DropdownMenuItem key={league.id} render={<Link to="/sports/$sport/$league" params={{ sport: league.sport, league: league.id }} />}>
                  <span className="font-semibold">{league.label}</span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {hasRecord ? (
                      <>
                        <span className={record!.won >= record!.lost ? 'text-win' : 'text-loss'}>
                          {record!.won}–{record!.lost}
                        </span>{' '}
                        record
                      </>
                    ) : (
                      `${compactVolume.format(volume)} vol`
                    )}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const { user, isPending, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-heading text-xl font-medium transition-opacity hover:opacity-80"
        >
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
                  <button
                    type="button"
                    className="rounded-full outline-offset-2 transition-opacity hover:opacity-80"
                  >
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
        <SportsNav />
      </nav>
    </header>
  )
}
