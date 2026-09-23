import { BarChart3 } from 'lucide-react'
import { useMyPicksAnalytics } from '@/hooks/usePicks'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PointsOverTimeChart } from './points-over-time-chart'
import { CalibrationChart } from './calibration-chart'
import { BreakdownChart } from './breakdown-chart'
import type { MyPicksSearch } from '@/lib/picks-search'

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function PicksAnalyticsSection({ search }: { search: MyPicksSearch }) {
  const { data, isPending, isError } = useMyPicksAnalytics(search)

  if (isPending) {
    return (
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || !data) return null

  const hasAnySettled = data.pointsOverTime.length > 0

  if (!hasAnySettled) {
    return (
      <div className="mb-5 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
        <BarChart3 className="size-5 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Charts appear once your first pick settles.</p>
      </div>
    )
  }

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
      <ChartCard title="Points over time" caption="Running total from settled picks, chronologically">
        <PointsOverTimeChart data={data.pointsOverTime} />
      </ChartCard>

      <ChartCard title="Calibration" caption="Predicted vs. actual win rate — dot size is sample size">
        <CalibrationChart data={data.calibration} />
      </ChartCard>

      <ChartCard title="Win rate by league" caption="Sorted by win rate, most to least">
        {data.byLeague.length > 0 ? (
          <BreakdownChart data={data.byLeague} />
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">No settled picks yet</p>
        )}
      </ChartCard>

      <ChartCard title="Win rate by market type" caption="Moneyline, spreads, and totals compared">
        {data.byMarketType.length > 0 ? (
          <BreakdownChart data={data.byMarketType} formatLabel={capitalize} />
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">No settled picks yet</p>
        )}
      </ChartCard>
    </div>
  )
}
