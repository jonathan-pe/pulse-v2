export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Pulse">
      <rect width="64" height="64" rx="17" fill="var(--primary)" />
      <path
        d="M6 32 H20 L26 18 L32 48 L38 32 H58"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
