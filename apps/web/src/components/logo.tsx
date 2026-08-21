export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Pulse">
      <rect width="64" height="64" rx="18" fill="var(--primary)" />
      <path
        d="M6 36 H20 L26 20 L33 44 L40 30 H46"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46" cy="30" r="4.5" fill="var(--ember)" />
    </svg>
  )
}
