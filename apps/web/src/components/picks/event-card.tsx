import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { EventWithMarkets } from "@/lib/api"
import { LineGroup, MarketRow } from "./line-group"

function formatStartTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function EventCard({ data }: { data: EventWithMarkets }) {
  const moneyline = data.markets.find((m) => m.marketType === "moneyline")
  const spreads = data.markets.filter((m) => m.marketType === "spreads")
  const totals = data.markets.filter((m) => m.marketType === "totals")
  const started = new Date(data.event.startTime) <= new Date()

  return (
    <Card>
      <CardContent>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-sm font-medium">{data.event.title}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={started ? "secondary" : "outline"}>{started ? "Locked" : "Open"}</Badge>
            {formatStartTime(data.event.startTime)}
          </div>
        </div>
        <div className="flex flex-col divide-y divide-dashed divide-border">
          {moneyline ? <MarketRow label="Moneyline" market={moneyline} /> : null}
          {spreads.length > 0 ? <LineGroup label="Spread" lines={spreads} /> : null}
          {totals.length > 0 ? <LineGroup label="Total" lines={totals} /> : null}
        </div>
      </CardContent>
    </Card>
  )
}
