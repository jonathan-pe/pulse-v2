import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateWinPoints, calculateLossPoints, calculatePoints } from './points.js'

// Worked examples from ADR: Scoring — Points Formula & Calibration
const cases = [
  { p: 0.83, win: 12.0, loss: -8.3 },
  { p: 0.52, win: 19.2, loss: -5.2 },
  { p: 0.4, win: 25.0, loss: -4.0 },
  { p: 0.125, win: 80.0, loss: -1.25 },
]

for (const { p, win, loss } of cases) {
  test(`p=${p}: win points ≈ ${win}`, () => {
    assert.ok(Math.abs(calculateWinPoints(p) - win) < 0.05)
  })

  test(`p=${p}: loss points ≈ ${loss}`, () => {
    assert.ok(Math.abs(calculateLossPoints(p) - loss) < 0.05)
  })
}

test('calculatePoints dispatches to win/loss correctly', () => {
  assert.equal(calculatePoints(0.5, true), calculateWinPoints(0.5))
  assert.equal(calculatePoints(0.5, false), calculateLossPoints(0.5))
})

test('rejects p out of (0, 1] range', () => {
  assert.throws(() => calculateWinPoints(0))
  assert.throws(() => calculateWinPoints(1.5))
  assert.throws(() => calculateWinPoints(-0.1))
})
