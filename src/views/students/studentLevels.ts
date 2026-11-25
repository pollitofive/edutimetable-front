// A student studies one or more tracks, at one level per track (card #28).
// The form keeps one row per track; these helpers hold its logic, free of Vue.

export interface LevelOption { id: string; track: { id: string; name: string }; name: string; sort_order: number }

export interface LevelRow { trackId: string; courseLevelId: string }

export const emptyRow = (): LevelRow => ({ trackId: '', courseLevelId: '' })

// Rows of an existing student, ordered by track name; a new student starts with one empty row
export function rowsFromLevels(levels: LevelOption[] | undefined): LevelRow[] {
  if (!levels?.length) return [emptyRow()]

  return [...levels]
    .sort((a, b) => a.track.name.localeCompare(b.track.name))
    .map(l => ({ trackId: l.track.id, courseLevelId: l.id }))
}

// Tracks a row can pick: the ones no other row took yet
export function availableTracks<T extends { id: string }>(tracks: T[], rows: LevelRow[], rowIndex: number): T[] {
  const taken = new Set(rows.filter((_, i) => i !== rowIndex).map(r => r.trackId).filter(Boolean))

  return tracks.filter(t => !taken.has(t.id))
}

export function levelsOfTrack(levels: LevelOption[], trackId: string): LevelOption[] {
  return levels.filter(l => l.track.id === trackId).sort((a, b) => a.sort_order - b.sort_order)
}

// Another row can be added while some track is left and every row is complete
export function canAddRow(rows: LevelRow[], trackCount: number): boolean {
  return rows.length < trackCount && rows.every(r => r.courseLevelId !== '')
}

// What the api takes: the chosen levels, skipping rows left empty
export function courseLevelIds(rows: LevelRow[]): string[] {
  return rows.map(r => r.courseLevelId).filter(Boolean)
}

// Error key of the form: 'missing' when no level was chosen, 'incomplete' when a row has a
// track without level. Null when it's valid.
export function levelRowsError(rows: LevelRow[]): 'missing' | 'incomplete' | null {
  if (rows.some(r => r.trackId !== '' && r.courseLevelId === '')) return 'incomplete'
  if (courseLevelIds(rows).length === 0) return 'missing'

  return null
}
