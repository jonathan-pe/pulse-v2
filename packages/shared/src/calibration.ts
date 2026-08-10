/**
 * Calibration (Brier score) — see ADR: Scoring, Points Formula & Calibration.
 *
 * Tracked separately from points; never feeds back into the points total.
 * 0 = perfect calibration, 1 = worst possible.
 */

export interface ScoredPrediction {
  /** Implied probability (0,1) of the picked outcome at pick time. */
  p: number
  /** Whether the picked outcome actually occurred. */
  isCorrect: boolean
}

export function brierScore(prediction: ScoredPrediction): number {
  const outcome = prediction.isCorrect ? 1 : 0
  return (outcome - prediction.p) ** 2
}

export function meanBrierScore(predictions: ScoredPrediction[]): number {
  if (predictions.length === 0) {
    throw new RangeError('predictions must not be empty')
  }
  const sum = predictions.reduce((acc, pred) => acc + brierScore(pred), 0)
  return sum / predictions.length
}
