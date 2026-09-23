import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatDate, formatPoints } from '@/lib/picks-summary'
import type { PointsOverTimePoint } from '@/lib/api'

const chartConfig = {
  cumulativePoints: { label: 'Cumulative points', color: 'var(--color-primary)' },
} satisfies ChartConfig

export function PointsOverTimeChart({ data }: { data: PointsOverTimePoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="pointsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis tickFormatter={formatPoints} tickLine={false} axisLine={false} width={44} />
        <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDate(value as string)}
              formatter={(value) => [formatPoints(Number(value)), ' cumulative points']}
            />
          }
        />
        <Area
          dataKey="cumulativePoints"
          type="monotone"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#pointsFill)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
