import { describe, it, expect } from 'vitest'
import type { PreviewRow } from '@/services/importService'
import {
  normalize, groupLevels, columnProblem, sampleRows, distinctValues, suggestLevel, syncLevelMapping,
  buildRequest, errorRowsCsv, type CourseLevelOption,
} from './importWizard'

const level = (id: string, name: string, track: string, sortOrder = 1): CourseLevelOption =>
  ({ id, name, sort_order: sortOrder, track: { id: track, name: track } })

// Two tracks with a level of the same name, as in the seed
const levels = [
  level('1', 'Beginner', 'English', 1),
  level('2', 'Advanced', 'English', 3),
  level('3', 'Beginner', 'French', 1),
  level('4', 'Intermedio', 'Español', 2),
]

const previewRow = (overrides: Partial<PreviewRow> = {}): PreviewRow => ({
  row: 2,
  status: 'new',
  data: { name: 'Lucía', email: 'lucia@example.com', phone: '' },
  errors: [],
  existing_id: null,
  ...overrides,
})

describe('normalize', () => {
  it('drops accents, case and punctuation', () => {
    expect(normalize('  Inglés - Inicial ')).toBe('ingles inicial')
    expect(normalize('FRENCH_B1')).toBe('french b1')
  })
})

describe('groupLevels', () => {
  it('groups by track, tracks by name and levels by sort order', () => {
    const groups = groupLevels([level('9', 'Advanced', 'English', 3), level('8', 'Básico', 'Alemán'), level('7', 'Beginner', 'English', 1)])

    expect(groups.map(g => g.track)).toEqual(['Alemán', 'English'])
    expect(groups[1].levels.map(l => l.id)).toEqual(['7', '9'])
  })
})

describe('columnProblem', () => {
  it('lists the required fields without a column', () => {
    expect(columnProblem({ name: 0, email: null }, ['name', 'email', 'level'])).toEqual({ kind: 'missing', fields: ['email', 'level'] })
  })

  it('detects a column used by two fields', () => {
    expect(columnProblem({ name: 0, email: 1, phone: 1 }, ['name', 'email'])).toEqual({ kind: 'repeated' })
  })

  it('accepts optional fields left out', () => {
    expect(columnProblem({ name: 0, email: 1, phone: null }, ['name', 'email'])).toBeNull()
  })
})

describe('sampleRows', () => {
  it('reads the first rows with the mapping, empty for unmapped fields', () => {
    const rows = [['lucia@x.com', 'Lucía'], ['tomas@x.com', 'Tomás'], ['a', 'b'], ['c', 'd']]

    expect(sampleRows(rows, ['name', 'email', 'phone'], { name: 1, email: 0, phone: null })).toEqual([
      { name: 'Lucía', email: 'lucia@x.com', phone: '' },
      { name: 'Tomás', email: 'tomas@x.com', phone: '' },
      { name: 'b', email: 'a', phone: '' },
    ])
  })
})

describe('distinctValues', () => {
  it('counts each value, ignoring blanks, in natural order', () => {
    const rows = [['Nivel 10'], ['Nivel 2'], [' Nivel 2 '], [''], ['Nivel 1']]

    expect(distinctValues(rows, 0)).toEqual([
      { value: 'Nivel 1', count: 1 },
      { value: 'Nivel 2', count: 2 },
      { value: 'Nivel 10', count: 1 },
    ])
  })

  it('is empty without a column', () => {
    expect(distinctValues([['x']], null)).toEqual([])
  })
})

describe('suggestLevel', () => {
  it('matches "track level" and "level track", without accents', () => {
    expect(suggestLevel('English Beginner', levels)).toBe('1')
    expect(suggestLevel('beginner - french', levels)).toBe('3')
    expect(suggestLevel('Español Intermedio', levels)).toBe('4')
  })

  it('matches the level name alone when only one track has it', () => {
    expect(suggestLevel('advanced', levels)).toBe('2')
  })

  it('leaves a name repeated in several tracks for the user', () => {
    expect(suggestLevel('Beginner', levels)).toBe('')
  })

  it('leaves an unknown level unassigned', () => {
    expect(suggestLevel('Inglés Avanzado', levels)).toBe('')
  })
})

describe('syncLevelMapping', () => {
  it('suggests new values and keeps what was chosen, even "not assigned"', () => {
    const current = { 'English Advanced': '3', 'English Beginner': '' }

    expect(syncLevelMapping(['English Advanced', 'English Beginner', 'French Beginner'], current, levels)).toEqual({
      'English Advanced': '3',
      'English Beginner': '',
      'French Beginner': '3',
    })
  })

  it('drops values no longer in the file', () => {
    expect(syncLevelMapping(['Advanced'], { Advanced: '2', Old: '1' }, levels)).toEqual({ Advanced: '2' })
  })

  it('with onlyEmpty, fills only the unassigned ones', () => {
    expect(syncLevelMapping(['English Beginner', 'Advanced'], { 'English Beginner': '', Advanced: '4' }, levels, true)).toEqual({
      'English Beginner': '1',
      Advanced: '4',
    })
  })
})

describe('buildRequest', () => {
  it('sends every field, the row numbers and the level ids as numbers', () => {
    const parsed = { rows: [['Lucía', 'lucia@x.com', 'Beginner']], row_numbers: [3] }

    expect(buildRequest(parsed, ['name', 'email', 'phone', 'level'], { name: 0, email: 1, level: 2 }, { Beginner: '3', Otro: '' }, 'update')).toEqual({
      rows: parsed.rows,
      row_numbers: [3],
      mapping: { name: 0, email: 1, phone: null, level: 2 },
      level_mapping: [{ value: 'Beginner', course_level_id: 3 }, { value: 'Otro', course_level_id: null }],
      duplicates: 'update',
    })
  })
})

describe('errorRowsCsv', () => {
  it('has a BOM, ";" and the original row of each error plus the reasons', () => {
    const rows = [['Lucía', 'lucia@x.com'], ['Sofía "Sofi"', ''], ['Mateo', 'mateo@']]
    const preview = [
      previewRow(),
      previewRow({ row: 4, status: 'error', errors: [{ field: 'email', code: 'required', message: 'Falta el email.' }] }),
      previewRow({ row: 5, status: 'error', errors: [
        { field: 'email', code: 'email', message: 'Email inválido.' },
        { field: 'level', code: 'level_unmapped', message: 'Nivel sin asignar.' },
      ] }),
    ]

    const csv = errorRowsCsv(['Nombre', 'Email'], rows, preview, 'Motivo')

    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      '"Nombre";"Email";"Motivo"',
      '"Sofía ""Sofi""";"";"Falta el email."',
      '"Mateo";"mateo@";"Email inválido. / Nivel sin asignar."',
    ])
  })
})
