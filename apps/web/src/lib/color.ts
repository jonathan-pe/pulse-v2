// Team brand colors range from very dark (navy, black) to quite light
// (gold, yellow) — a fixed white-on-color treatment reads fine for most but
// fails contrast on the light end (e.g. the Steelers' gold). WCAG relative
// luminance decides white vs. near-black text per color instead of guessing.
export function contrastTextColor(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!match) return "#fff"
  const n = Number.parseInt(match[1]!, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  return luminance > 0.45 ? "#1a1a1a" : "#fff"
}

// For team-colored text sitting directly on the app's own card background
// (not a solid team-colored fill, where contrastTextColor above already
// handles it) — a light team color (Raiders silver) can be unreadable
// against a light theme's card, and a dark one (Cowboys navy) can vanish
// against a dark theme's card. Blending toward the app's own --foreground
// solves both directions in one shot and needs no light/dark branching: the
// app already keeps --foreground contrast-tested against --card in each
// theme, and this CSS variable flips with the theme automatically, so the
// blended result inherits that same guarantee — mixing 45% of the way there
// keeps the team hue recognizable while pulling it solidly into readable
// territory.
export function readableAccentText(hex: string): string {
  return `color-mix(in oklch, ${hex} 55%, var(--color-foreground) 45%)`
}
