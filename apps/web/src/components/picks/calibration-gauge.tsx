// Same metric PicksStatsRow shows ("Brier score — lower is sharper") — the
// gauge just adds a visual arc on top of the same raw number, rather than
// inventing a separate inverted "quality %" the rest of the app doesn't use.
// 0 = perfect calibration, 1 = worst possible (see packages/shared/calibration.ts).
const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function calibrationLabel(brierScore: number): string {
  if (brierScore < 0.15) return "Well-calibrated"
  if (brierScore < 0.25) return "Reasonably calibrated"
  return "Room to sharpen up"
}

export function CalibrationGauge({
  brierScore,
  caption,
}: {
  brierScore: number
  caption: string
}) {
  const fraction = Math.max(0, Math.min(1, 1 - brierScore))
  const offset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div className="flex items-center gap-4">
      <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
        <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="var(--color-muted)" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="36" textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-base font-bold">
          {brierScore.toFixed(2)}
        </text>
      </svg>
      <div>
        <div className="text-sm font-semibold">{calibrationLabel(brierScore)}</div>
        <div className="text-xs text-muted-foreground">{caption}</div>
      </div>
    </div>
  )
}
