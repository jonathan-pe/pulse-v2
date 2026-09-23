import { useMemo } from 'react'
import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatPercent } from '@/lib/picks-summary'
import type { CalibrationBucket } from '@/lib/api'

const chartConfig = {
  actualRate: { label: 'Actual win rate', color: 'var(--color-primary)' },
} satisfies ChartConfig

// Dot size carries sample size — a bucket built from 2 picks should read as
// less certain than one built from 20, without hiding it outright.
const MIN_DOT_SIZE = 60
const MAX_DOT_SIZE = 400

export function CalibrationChart({ data }: { data: CalibrationBucket[] }) {
  const maxCount = useMemo(() => Math.max(1, ...data.map((bucket) => bucket.count)), [data])

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="predictedRate"
          domain={[0, 1]}
          tickFormatter={formatPercent}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          name="Predicted"
        />
        <YAxis
          type="number"
          dataKey="actualRate"
          domain={[0, 1]}
          tickFormatter={formatPercent}
          tickLine={false}
          axisLine={false}
          width={44}
          name="Actual"
        />
        <ZAxis type="number" dataKey="count" range={[MIN_DOT_SIZE, MAX_DOT_SIZE]} domain={[0, maxCount]} />
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ]}
          stroke="var(--color-muted-foreground)"
          strokeDasharray="4 4"
          label={{ value: 'Perfect calibration', position: 'insideTopLeft', fill: 'var(--color-muted-foreground)', fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_value, _name, item) => {
                const bucket = item.payload as CalibrationBucket
                return [
                  `${formatPercent(bucket.predictedRate)} predicted → ${formatPercent(bucket.actualRate)} actual (${bucket.count} pick${bucket.count === 1 ? '' : 's'})`,
                  '',
                ]
              }}
            />
          }
        />
        <Scatter data={data} dataKey="actualRate" fill="var(--color-actualRate)" fillOpacity={0.75} isAnimationActive={false} />
      </ScatterChart>
    </ChartContainer>
  )
}
