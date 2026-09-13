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
