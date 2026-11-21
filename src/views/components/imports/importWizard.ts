// Pure logic of the import wizard (useImportWizard.ts): no Vue, no api.
import type { ColumnMapping, ImportField, ImportRequest, DuplicatesMode, PreviewRow } from '@/services/importService'

export interface CourseLevelOption { id: string; name: string; sort_order: number; track: { id: string; name: string } }

export interface LevelGroup { track: string; levels: CourseLevelOption[] }

// Lowercase, without accents nor punctuation: "Inglés - Inicial" → "ingles inicial"
export const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Levels grouped by track (tracks by name, levels by sort_order), for the <optgroup>s
export function groupLevels(levels: CourseLevelOption[]): LevelGroup[] {
  const groups = new Map<string, LevelGroup>()
  for (const level of levels) {
    const group = groups.get(level.track.id) ?? { track: level.track.name, levels: [] }
    group.levels.push(level)
    groups.set(level.track.id, group)
  }
  return [...groups.values()]
    .map(g => ({ ...g, levels: [...g.levels].sort((a, b) => a.sort_order - b.sort_order) }))
    .sort((a, b) => a.track.localeCompare(b.track))
}

// Problem with the column mapping: required fields without a column, or a column used twice
export type ColumnProblem = { kind: 'missing'; fields: ImportField[] } | { kind: 'repeated' } | null

export function columnProblem(mapping: ColumnMapping, required: ImportField[]): ColumnProblem {
  const missing = required.filter(f => mapping[f] == null)
  if (missing.length) return { kind: 'missing', fields: missing }

  const used = Object.values(mapping).filter((c): c is number => c != null)
  if (new Set(used).size !== used.length) return { kind: 'repeated' }

  return null
}

// First rows of the file, as they would be read with the mapping
export function sampleRows(rows: string[][], fields: ImportField[], mapping: ColumnMapping, limit = 3): Record<string, string>[] {
  return rows.slice(0, limit).map(row =>
    Object.fromEntries(fields.map(f => [f, mapping[f] != null ? row[mapping[f] as number] ?? '' : '']))
  )
}

// Distinct values of a column with how many rows have each, in natural order
export function distinctValues(rows: string[][], column: number | null | undefined): Array<{ value: string; count: number }> {
  if (column == null) return []
  const counts = new Map<string, number>()
  for (const row of rows) {
    const value = (row[column] ?? '').trim()
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }))
}

// A level of the file is suggested when it matches one level by name, "track level" or
// "level track". A name repeated in several tracks is left for the user to choose ('').
export function suggestLevel(value: string, levels: CourseLevelOption[]): string {
  const target = normalize(value)
  const matches = levels.filter(level => [
    level.name,
    `${level.track.name} ${level.name}`,
    `${level.name} ${level.track.name}`,
  ].some(candidate => normalize(candidate) === target))

  return matches.length === 1 ? matches[0].id : ''
}

// One entry per value of the file: keeps what was already chosen (even "not assigned")
// and suggests the new ones. With onlyEmpty, it fills just the ones still not assigned
// (the course levels arrived after the file was read).
export function syncLevelMapping(
  values: string[],
  current: Record<string, string>,
  levels: CourseLevelOption[],
  onlyEmpty = false,
): Record<string, string> {
  return Object.fromEntries(values.map(value => {
    const chosen = current[value]
    const keep = onlyEmpty ? !!chosen : chosen !== undefined
    return [value, keep ? chosen : suggestLevel(value, levels)]
  }))
}

export function buildRequest(
  parsed: { rows: string[][]; row_numbers: number[] } | null,
  fields: ImportField[],
  mapping: ColumnMapping,
  levelMapping: Record<string, string>,
  duplicates: DuplicatesMode,
): ImportRequest {
  return {
    rows: parsed?.rows ?? [],
    row_numbers: parsed?.row_numbers ?? [],
    mapping: Object.fromEntries(fields.map(f => [f, mapping[f] ?? null])),
    level_mapping: Object.entries(levelMapping).map(([value, id]) => ({ value, course_level_id: id ? Number(id) : null })),
    duplicates,
  }
}

// Rows with an error, as in the file plus a column with the reason, so they can be fixed
// and imported again. ";" and a BOM so Excel in Spanish opens it right. The preview rows
// come in the same order as the parsed ones.
export function errorRowsCsv(headers: string[], rows: string[][], previewRows: PreviewRow[], reasonHeader: string): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [[...headers, reasonHeader]]
  previewRows.forEach((row, i) => {
    if (row.status === 'error') lines.push([...(rows[i] ?? []), row.errors.map(e => e.message).join(' / ')])
  })
  return '﻿' + lines.map(line => line.map(quote).join(';')).join('\r\n')
}
