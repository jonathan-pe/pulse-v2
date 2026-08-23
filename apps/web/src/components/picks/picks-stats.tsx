import { Crosshair, Flame, Percent, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPoints } from '@/lib/picks-summary'
import type { PicksStats } from '@/lib/api'

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatBrier(value: number): string {
  return value.toFixed(2)
}

function formatStreak(streak: PicksStats['streak']): string {
  if (streak.type === null) return '—'
  return `${streak.count}`
}

interface Tile {
  label: string
  icon: typeof Percent
  value: string
  caption?: string
  tone?: 'win' | 'loss'
}

export function PicksStatsRow({ stats }: { stats: PicksStats }) {
  const settled = stats.won + stats.lost

  const tiles: Tile[] = [
    {
      label: 'Win rate',
      icon: Percent,
      value: stats.winRate === null ? '—' : formatPercent(stats.winRate),
      caption: settled > 0 ? `${stats.won}–${stats.lost} settled` : 'No settled picks yet',
    },
    {
      label: 'Total points',
      icon: Zap,
      value: formatPoints(stats.totalPoints),
      caption: 'Longshots pay more than favorites',
      tone: stats.totalPoints > 0 ? 'win' : stats.totalPoints < 0 ? 'loss' : undefined,
    },
    {
      label: 'Calibration',
      icon: Crosshair,
      value: stats.brierScore === null ? '—' : formatBrier(stats.brierScore),
      caption: 'Brier score — lower is sharper',
    },
    {
      label: 'Streak',
      icon: Flame,
      value: formatStreak(stats.streak),
      caption: stats.streak.type === 'won' ? 'wins in a row' : stats.streak.type === 'lost' ? 'losses in a row' : 'No streak yet',
      tone: stats.streak.type === 'won' ? 'win' : stats.streak.type === 'lost' ? 'loss' : undefined,
    },
  ]

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2.5 flex items-center gap-1.5 text-muted-foreground">
            <tile.icon className="size-3.5" strokeWidth={2.25} />
            <span className="font-mono text-[10px] font-bold tracking-wide uppercase">{tile.label}</span>
          </div>
          <div
            className={cn(
              'font-mono text-2xl leading-none font-semibold tabular-nums',
              tile.tone === 'win' && 'text-win',
              tile.tone === 'loss' && 'text-loss',
            )}
          >
            {tile.value}
          </div>
          {tile.caption ? <div className="mt-1.5 text-xs text-muted-foreground">{tile.caption}</div> : null}
        </div>
      ))}
    </div>
  )
}
