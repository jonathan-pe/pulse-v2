/**
 * Points formula — see ADR: Scoring, Points Formula & Calibration.
 *
 * `p` is the Polymarket implied probability (0,1) for the picked outcome,
 * captured at pick time. Win/loss constants match v1's shipped values.
 */

export const POINTS_K = 10
export const LOSS_MULTIPLIER = 1.0

export function calculateWinPoints(p: number, k: number = POINTS_K): number {
  if (p <= 0 || p > 1) {
    throw new RangeError(`p must be in (0, 1], got ${p}`)
  }
  return k / p
}

export function calculateLossPoints(
  p: number,
  k: number = POINTS_K,
  lossMultiplier: number = LOSS_MULTIPLIER,
): number {
  if (p <= 0 || p > 1) {
    throw new RangeError(`p must be in (0, 1], got ${p}`)
  }
  return -lossMultiplier * k * p
}

export function calculatePoints(p: number, isCorrect: boolean): number {
  return isCorrect ? calculateWinPoints(p) : calculateLossPoints(p)
}
