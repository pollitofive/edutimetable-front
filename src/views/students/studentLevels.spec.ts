import { describe, expect, it } from 'vitest'
import {
  availableTracks, canAddRow, courseLevelIds, emptyRow, levelRowsError, levelsOfTrack, rowsFromLevels,
  type LevelOption,
} from './studentLevels'

const english = { id: '1', name: 'Inglés' }
const portuguese = { id: '2', name: 'Portugués' }
const level = (id: string, track: { id: string; name: string }, sort_order = 1): LevelOption =>
  ({ id, track, name: `Nivel ${id}`, sort_order })

describe('rowsFromLevels', () => {
  it('starts a new student with one empty row', () => {
    expect(rowsFromLevels([])).toEqual([emptyRow()])
    expect(rowsFromLevels(undefined)).toEqual([emptyRow()])
  })

  it('gives one row per level, ordered by track name', () => {
    expect(rowsFromLevels([level('20', portuguese), level('10', english)])).toEqual([
      { trackId: '1', courseLevelId: '10' },
      { trackId: '2', courseLevelId: '20' },
    ])
  })
})

describe('availableTracks', () => {
  it('leaves out the tracks other rows took, but not the row own one', () => {
    const rows = [{ trackId: '1', courseLevelId: '10' }, { trackId: '2', courseLevelId: '' }]

    expect(availableTracks([english, portuguese], rows, 0)).toEqual([english])
    expect(availableTracks([english, portuguese], rows, 1)).toEqual([portuguese])
  })
})

describe('levelsOfTrack', () => {
  it('keeps the levels of the track sorted', () => {
    const levels = [level('11', english, 2), level('20', portuguese), level('10', english, 1)]

    expect(levelsOfTrack(levels, '1').map(l => l.id)).toEqual(['10', '11'])
  })
})

describe('canAddRow', () => {
  it('allows another track only while one is left and the rows are complete', () => {
    expect(canAddRow([{ trackId: '1', courseLevelId: '10' }], 2)).toBe(true)
    expect(canAddRow([{ trackId: '1', courseLevelId: '' }], 2)).toBe(false)
    expect(canAddRow([{ trackId: '1', courseLevelId: '10' }, { trackId: '2', courseLevelId: '20' }], 2)).toBe(false)
  })
})

describe('courseLevelIds / levelRowsError', () => {
  it('sends the chosen levels, skipping empty rows', () => {
    expect(courseLevelIds([{ trackId: '1', courseLevelId: '10' }, emptyRow()])).toEqual(['10'])
  })

  it('requires at least one level', () => {
    expect(levelRowsError([emptyRow()])).toBe('missing')
  })

  it('rejects a track without level', () => {
    expect(levelRowsError([{ trackId: '1', courseLevelId: '10' }, { trackId: '2', courseLevelId: '' }])).toBe('incomplete')
  })

  it('accepts complete rows, plus empty ones', () => {
    expect(levelRowsError([{ trackId: '1', courseLevelId: '10' }, emptyRow()])).toBeNull()
  })
})
