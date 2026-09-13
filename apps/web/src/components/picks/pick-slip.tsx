import { Link } from "@tanstack/react-router"
import { ArrowDown, ArrowUp, Ticket, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useStaging, type StagedPick } from "@/hooks/usePicksStaging"
import { readableAccentText } from "@/lib/color"
import { TeamBadge } from "./team-badge"

const MARKET_LABEL = {
  moneyline: "Moneyline",
  spreads: "Spread",
  totals: "Total",
} as const

// The circular notches at each divider are a literal ticket perforation —
// `Ticket` is already the icon used for "My Picks" in the header, so this
// leans into an identity the app already chose rather than inventing a new
// one. Each notch is a background-colored circle straddling the card's own
// edge, half-clipped by the card's overflow-hidden — same illusion a real
// perforated ticket stub uses.
function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 size-3.5 -translate-y-1/2 rounded-full bg-background",
        side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
      )}
    />
  )
}

// Same badge everywhere else uses for moneyline/spread (real logo, falling
// back to team-colored initials). Totals has no team to show — its fixed
// win/destructive tone (see PriceCell) fills the same slot with an up/down
// arrow instead (Over moves the total up, Under moves it down), so every
// entry gets a colored mark rather than only some of them. Sized to match
// the two-line team/market stack next to it (see the entry layout below)
// rather than an arbitrary icon size — the row reads as one unit, badge
// included, instead of a small icon floating next to taller text.
function EntryBadge({ entry }: { entry: StagedPick }) {
  if (entry.teamLogoUrl || entry.teamColor) {
    const name = entry.outcomeName.replace(/\s*[+−-].*$/, "")
    return (
      <TeamBadge
        className="size-9 shrink-0 rounded-md"
        team={{ name, logoUrl: entry.teamLogoUrl ?? null, color: entry.teamColor ?? null, record: null }}
      />
    )
  }
  const isOver = entry.tone === "win"
  const Icon = isOver ? ArrowUp : ArrowDown
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md",
        isOver ? "bg-win/15 text-win" : "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="size-4.5" strokeWidth={2.5} />
    </div>
  )
}

// Team colors are arbitrary and unvetted for contrast against the card
// background (unlike win/destructive, which are already app tokens tuned for
// exactly this) — see readableAccentText for why team color specifically
// needs the extra step.
function entryPercentColor(entry: StagedPick): string {
  if (entry.teamColor) return readableAccentText(entry.teamColor)
  if (entry.tone === "win") return "var(--color-win)"
  if (entry.tone === "destructive") return "var(--color-destructive)"
  return "var(--color-primary)"
}

// Picks from the same game land in one group, in the order their event was
// first staged — a group is never re-sorted as more picks join it, so it
// doesn't jump around the list while you're still building it out.
function groupByEvent(entries: StagedPick[]): { eventId: string; eventTitle: string; picks: StagedPick[] }[] {
  const order: string[] = []
  const picksByEvent = new Map<string, StagedPick[]>()
  for (const entry of entries) {
    const list = picksByEvent.get(entry.eventId)
    if (list) {
      list.push(entry)
    } else {
      picksByEvent.set(entry.eventId, [entry])
      order.push(entry.eventId)
    }
  }
  return order.map((eventId) => {
    const picks = picksByEvent.get(eventId)!
    return { eventId, eventTitle: picks[0]!.eventTitle, picks }
  })
}

export function PickSlip() {
  const { user } = useAuth()
  const { staged, errors, isConfirming, unstage, clearStaged, confirmAll } = useStaging()
  const entries = [...staged.values()]
  const groups = groupByEvent(entries)

  return (
    <div className="sticky top-24 overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <span className="flex items-center gap-1.5 font-semibold">
          <Ticket className="size-4 text-muted-foreground" />
          Picks
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {entries.length > 0 ? entries.length : null}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Click a price to add it here.
          <br />
          Nothing is submitted until you confirm.
        </p>
      ) : (
        <div className="flex flex-col">
          {groups.map((group, gi) => (
            <div key={group.eventId} className="relative border-b border-dashed border-border px-4 py-3 last:border-b-0">
              {gi > 0 ? (
                <>
                  <Notch side="left" />
                  <Notch side="right" />
                </>
              ) : null}
              <div className="mb-2 truncate text-xs text-muted-foreground">{group.eventTitle}</div>
              <div className="flex flex-col gap-2.5">
                {group.picks.map((entry) => {
                  const error = errors.get(entry.marketId)
                  return (
                    <div key={entry.marketId}>
                      <div className="relative flex items-center justify-between gap-2 pr-9">
                        <div className="flex min-w-0 items-center gap-2">
                          <EntryBadge entry={entry} />
                          <div className="min-w-0">
                            <div className="truncate text-sm leading-tight font-semibold">{entry.outcomeName}</div>
                            <div className="text-xs leading-tight text-muted-foreground">{MARKET_LABEL[entry.marketType]}</div>
                          </div>
                        </div>
                        <span
                          className="shrink-0 font-mono text-base font-bold tabular-nums"
                          style={{ color: entryPercentColor(entry) }}
                        >
                          {(Number(entry.price) * 100).toFixed(1)}%
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => unstage(entry.marketId)}
                          aria-label="Remove from picks"
                          className="absolute top-1/2 right-0 size-6 -translate-y-1/2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && !user ? (
        <div className="flex flex-col gap-1.5 px-4 py-3.5">
          <p className="text-center text-xs text-muted-foreground">Sign in to confirm your picks.</p>
          <Button size="sm" render={<Link to="/sign-in" />}>
            Sign in
          </Button>
          <Button variant="ghost" size="sm" onClick={clearStaged}>
            Clear
          </Button>
        </div>
      ) : entries.length > 0 ? (
        <div className="flex flex-col gap-1.5 px-4 py-3.5">
          <Button size="sm" disabled={isConfirming} onClick={() => void confirmAll()}>
            {isConfirming ? "Confirming…" : `Confirm ${entries.length} ${entries.length === 1 ? "pick" : "picks"}`}
          </Button>
          <Button variant="ghost" size="sm" disabled={isConfirming} onClick={clearStaged}>
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  )
}
