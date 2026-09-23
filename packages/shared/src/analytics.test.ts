import { test } from 'node:test'
import assert from 'node:assert/strict'
import { breakdownBy, calibrationBuckets, pointsOverTime, type SettledPickForAnalytics } from './analytics.js'

function pick(overrides: Partial<SettledPickForAnalytics> = {}): SettledPickForAnalytics {
  return {
    points: 0,
    priceAtPick: 0.5,
    isCorrect: true,
    eventStartTime: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

test('pointsOverTime is empty for no picks', () => {
  assert.deepEqual(pointsOverTime([]), [])
})

test('pointsOverTime sorts chronologically and accumulates regardless of input order', () => {
  const result = pointsOverTime([
    pick({ points: 5, eventStartTime: new Date('2026-01-03T00:00:00Z') }),
    pick({ points: 3, eventStartTime: new Date('2026-01-01T00:00:00Z') }),
    pick({ points: -2, eventStartTime: new Date('2026-01-02T00:00:00Z') }),
  ])
  assert.deepEqual(
    result.map((r) => r.cumulativePoints),
    [3, 1, 6],
  )
})

test('calibrationBuckets groups by [bucketMin, bucketMax) and computes predicted/actual rates', () => {
  const buckets = calibrationBuckets([
    pick({ priceAtPick: 0.42, isCorrect: true }),
    pick({ priceAtPick: 0.48, isCorrect: false }),
    pick({ priceAtPick: 0.91, isCorrect: true }),
  ])
  assert.equal(buckets.length, 2)

  const midBucket = buckets.find((b) => b.bucketMin === 0.4)!
  assert.equal(midBucket.count, 2)
  assert.equal(midBucket.actualRate, 0.5)
  assert.ok(Math.abs(midBucket.predictedRate - 0.45) < 1e-9)

  const topBucket = buckets.find((b) => b.bucketMin === 0.9)!
  assert.equal(topBucket.count, 1)
  assert.equal(topBucket.bucketMax, 1.0)
})

test('calibrationBuckets folds price === 1 into the last bucket rather than an 11th one', () => {
  const buckets = calibrationBuckets([pick({ priceAtPick: 1 })])
  assert.equal(buckets.length, 1)
  assert.equal(buckets[0].bucketMin, 0.9)
})

test('breakdownBy groups by an arbitrary key and totals win/loss/points', () => {
  const result = breakdownBy(
    [
      pick({ points: 4, isCorrect: true }),
      pick({ points: -2, isCorrect: false }),
      pick({ points: 6, isCorrect: true }),
    ],
    () => ({ key: 'nba', label: 'NBA' }),
  )
  assert.deepEqual(result, [{ key: 'nba', label: 'NBA', count: 3, won: 2, lost: 1, winRate: 2 / 3, points: 8 }])
})
