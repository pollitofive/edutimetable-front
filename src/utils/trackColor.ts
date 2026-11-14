// Deterministic color per track id: stays stable regardless of locale or track
// name, and needs no hardcoded entry when a new track is created.
const trackColorPalette = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#ef4444']

export function getTrackColor(trackId: number | string): string {
  const id = Number(trackId)
  if (isNaN(id)) return '#6b7280'
  return trackColorPalette[id % trackColorPalette.length]
}
