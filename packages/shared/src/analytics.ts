/**
 * Aggregation for the picks-analytics charts (points over time, calibration
 * curve, league/market-type breakdowns). Pure functions over a flat list of
 * already-settled picks — no DB, no framework — same pattern as points.ts
 * and calibration.ts.
 */

export interface SettledPickForAnalytics {
  points: number
  /** Implied probability (0,1] of the picked outcome at pick time. */
  priceAtPick: number
  isCorrect: boolean
  // The event's kickoff time, not when settlePicksForMarket() happened to
  // write the row — matches the rest of the app's "date" ordering (see
  // listMyPicks's default sort and computeStats's streak derivation), and
  // stays defined even for a pick that's live-scored won/lost but not yet
  // cached (settledAt is null until that write happens).
  eventStartTime: Date
}

export interface PointsOverTimePoint {
  date: string
  points: number
  cumulativePoints: number
}

export function pointsOverTime(picks: SettledPickForAnalytics[]): PointsOverTimePoint[] {
  const sorted = [...picks].sort((a, b) => a.eventStartTime.getTime() - b.eventStartTime.getTime())
  let running = 0
  return sorted.map((pick) => {
    running += pick.points
    return { date: pick.eventStartTime.toISOString(), points: pick.points, cumulativePoints: running }
  })
}

export interface CalibrationBucket {
  bucketMin: number
  bucketMax: number
  predictedRate: number
  actualRate: number
  count: number
}

const BUCKET_WIDTH = 0.1
const BUCKET_COUNT = 10

// price === 1 falls in the same bucket as [0.9, 1) rather than needing an
// 11th bucket — every bucket is otherwise a clean half-open [min, max) span.
export function calibrationBuckets(picks: SettledPickForAnalytics[]): CalibrationBucket[] {
  const buckets = new Map<number, SettledPickForAnalytics[]>()
  for (const pick of picks) {
    const index = Math.min(Math.floor(pick.priceAtPick / BUCKET_WIDTH), BUCKET_COUNT - 1)
    const group = buckets.get(index)
    if (group) {
      group.push(pick)
    } else {
      buckets.set(index, [pick])
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, group]) => ({
      bucketMin: index * BUCKET_WIDTH,
      bucketMax: (index + 1) * BUCKET_WIDTH,
      predictedRate: group.reduce((sum, pick) => sum + pick.priceAtPick, 0) / group.length,
      actualRate: group.filter((pick) => pick.isCorrect).length / group.length,
      count: group.length,
    }))
}

export interface GroupBreakdown {
  key: string
  label: string
  count: number
  won: number
  lost: number
  winRate: number
  points: number
}

// Key is always plain string at every call site (league id, market type) —
// no caller has ever needed the key type narrowed, so this isn't generic.
export function breakdownBy<T extends SettledPickForAnalytics>(
  picks: T[],
  keyOf: (pick: T) => { key: string; label: string },
): GroupBreakdown[] {
  const groups = new Map<string, { label: string; picks: T[] }>()
  for (const pick of picks) {
    const { key, label } = keyOf(pick)
    const group = groups.get(key)
    if (group) {
      group.picks.push(pick)
    } else {
      groups.set(key, { label, picks: [pick] })
    }
  }

  return [...groups.entries()].map(([key, { label, picks }]) => {
    const won = picks.filter((pick) => pick.isCorrect).length
    return {
      key,
      label,
      count: picks.length,
      won,
      lost: picks.length - won,
      winRate: won / picks.length,
      points: picks.reduce((sum, pick) => sum + pick.points, 0),
    }
  })
}
