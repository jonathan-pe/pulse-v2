import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatPercent } from '@/lib/picks-summary'
import type { GroupBreakdown } from '@/lib/api'

const chartConfig = {
  winRate: { label: 'Win rate', color: 'var(--color-primary)' },
} satisfies ChartConfig

// Single hue, sorted, identified by axis label — Pulse's --chart-1..5 tokens
// are a lightness ramp on one hue, not a colorblind-safe categorical set
// (see Picks Analytics Plan, "Color & palette note"), so category identity
// comes from the label, not from assigning each bar its own color.
export function BreakdownChart({ data, formatLabel }: { data: GroupBreakdown[]; formatLabel?: (label: string) => string }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.winRate - a.winRate), [data])

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: Math.max(120, sorted.length * 44) }}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis
          type="category"
          dataKey="label"
          tickFormatter={(value: string) => formatLabel?.(value) ?? value}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_value, _name, item) => {
                const group = item.payload as GroupBreakdown
                return [`${formatPercent(group.winRate)} win rate — ${group.won}–${group.lost}, ${group.count} settled`, '']
              }}
            />
          }
        />
        <Bar dataKey="winRate" fill="var(--color-winRate)" radius={4} isAnimationActive={false}>
          <LabelList
            dataKey="winRate"
            position="right"
            formatter={(value) => (typeof value === 'number' ? formatPercent(value) : '')}
            className="fill-muted-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
