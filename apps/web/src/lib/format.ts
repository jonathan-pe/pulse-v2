export const compactVolume = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 1,
})

// Deliberately coarse ("Xm ago" / "Xh ago") rather than exact — this backs
// the LIVE-game "updated" label, which exists specifically to admit that
// ingestion runs every ~15min rather than implying a real-time scoreboard.
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
