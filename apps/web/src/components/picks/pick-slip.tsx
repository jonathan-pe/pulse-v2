import { Link } from "@tanstack/react-router"
import { Ticket, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useStaging } from "@/hooks/usePicksStaging"

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

export function PickSlip() {
  const { user } = useAuth()
  const { staged, errors, isConfirming, unstage, clearStaged, confirmAll } = useStaging()
  const entries = [...staged.values()]

  return (
    <div className="sticky top-24 overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <span className="flex items-center gap-1.5 font-semibold">
          <Ticket className="size-4 text-muted-foreground" />
          Picks
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {entries.length > 0 ? `${entries.length} staged` : null}
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
          {entries.map((entry, i) => {
            const error = errors.get(entry.marketId)
            return (
              <div
                key={entry.marketId}
                className={cn(
                  "relative border-b border-dashed border-border px-4 py-3 last:border-b-0",
                  error && "bg-destructive/5",
                )}
              >
                {i > 0 ? (
                  <>
                    <Notch side="left" />
                    <Notch side="right" />
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => unstage(entry.marketId)}
                  aria-label="Remove from picks"
                  className="absolute top-2.5 right-3 size-[18px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3" />
                </Button>
                <div className="mb-1 truncate pr-5 text-[11.5px] text-muted-foreground">{entry.eventTitle}</div>
                <div className="flex items-center justify-between gap-2 pr-5">
                  <span className="text-[13.5px] font-semibold">{entry.outcomeName}</span>
                  <span className="font-mono text-xs tabular-nums text-primary">
                    {(Number(entry.price) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-[11.5px] text-muted-foreground">{MARKET_LABEL[entry.marketType]}</div>
                {error ? <div className="mt-1 text-[11px] text-destructive">{error}</div> : null}
              </div>
            )
          })}
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
