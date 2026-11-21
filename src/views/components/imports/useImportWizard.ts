import { gql } from '@apollo/client/core'
import { useQuery } from '@vue/apollo-composable'
import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  importService,
  importErrorMessage,
  downloadBlob,
  type ColumnMapping,
  type CommitResult,
  type DuplicatesMode,
  type ImportField,
  type ImportRequest,
  type ImportType,
  type ParseResult,
  type PreviewResult,
  type RowStatus,
} from '@/services/importService'

export type WizardStep = 'file' | 'columns' | 'levels' | 'review' | 'result'

interface CourseLevelOption { id: string; name: string; sort_order: number; track: { id: string; name: string } }

const GET_COURSE_LEVELS = gql`
  query GetCourseLevels { courseLevels(first: 100, page: 1) { data { id track { id name } name slug sort_order } } }
`

// Rows listed per status filter in the review step; the totals always count all of them
export const REVIEW_ROWS_LIMIT = 100

// Lowercase, without accents nor punctuation: "Inglés - Inicial" → "ingles inicial"
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function useImportWizard(type: Ref<ImportType>) {
  const { t } = useI18n()

  const step = ref<WizardStep>('file')
  const parsed = ref<ParseResult | null>(null)
  const fileName = ref('')
  const mapping = ref<ColumnMapping>({})
  // Distinct level of the file → course level id ('' = not assigned)
  const levelMapping = ref<Record<string, string>>({})
  const duplicates = ref<DuplicatesMode>('skip')
  const preview = ref<PreviewResult | null>(null)
  const statusFilter = ref<RowStatus | 'all'>('all')
  const result = ref<CommitResult | null>(null)
  const busy = ref(false)
  const error = ref('')

  const isStudents = computed(() => type.value === 'students')

  const { result: levelsResult } = useQuery(GET_COURSE_LEVELS, {}, () => ({
    enabled: isStudents.value,
    fetchPolicy: 'cache-and-network',
  }))
  const courseLevels = computed<CourseLevelOption[]>(() => levelsResult.value?.courseLevels?.data ?? [])

  // Levels grouped by track, for the <optgroup>s of the level selects
  const levelGroups = computed(() => {
    const groups = new Map<string, { track: string; levels: CourseLevelOption[] }>()
    for (const level of courseLevels.value) {
      const group = groups.get(level.track.id) ?? { track: level.track.name, levels: [] }
      group.levels.push(level)
      groups.set(level.track.id, group)
    }
    return [...groups.values()]
      .map(g => ({ ...g, levels: [...g.levels].sort((a, b) => a.sort_order - b.sort_order) }))
      .sort((a, b) => a.track.localeCompare(b.track))
  })

  const fields = computed<ImportField[]>(() => parsed.value?.fields ?? [])
  const requiredFields = computed<ImportField[]>(() => isStudents.value ? ['name', 'email', 'level'] : ['name', 'email'])

  const steps = computed<WizardStep[]>(() =>
    isStudents.value ? ['file', 'columns', 'levels', 'review', 'result'] : ['file', 'columns', 'review', 'result']
  )

  const columnError = computed(() => {
    const missing = requiredFields.value.filter(f => mapping.value[f] == null)
    if (missing.length) return t('imports.columns.missing', { fields: missing.map(f => t(`imports.fields.${f}`)).join(', ') })

    const used = Object.values(mapping.value).filter((c): c is number => c != null)
    if (new Set(used).size !== used.length) return t('imports.columns.repeated')

    return ''
  })

  // First rows of the file, as they would be read with the current mapping
  const sampleRows = computed(() =>
    (parsed.value?.rows ?? []).slice(0, 3).map(row =>
      Object.fromEntries(fields.value.map(f => [f, mapping.value[f] != null ? row[mapping.value[f] as number] ?? '' : '']))
    )
  )

  // Distinct values of the level column with how many rows have each
  const levelValues = computed(() => {
    const column = mapping.value.level
    if (column == null || !parsed.value) return []
    const counts = new Map<string, number>()
    for (const row of parsed.value.rows) {
      const value = (row[column] ?? '').trim()
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }))
  })

  const unmappedLevels = computed(() => levelValues.value.filter(v => !levelMapping.value[v.value]).length)

  const filteredRows = computed(() => {
    const rows = preview.value?.rows ?? []
    return statusFilter.value === 'all' ? rows : rows.filter(r => r.status === statusFilter.value)
  })
  const visibleRows = computed(() => filteredRows.value.slice(0, REVIEW_ROWS_LIMIT))
  const importableCount = computed(() => (preview.value?.summary.new ?? 0) + (preview.value?.summary.update ?? 0))

  // A level of the file is suggested when it matches one level by name, "track level" or
  // "level track". A name repeated in several tracks is left for the user to choose.
  function suggestLevel(value: string): string {
    const target = normalize(value)
    const matches = courseLevels.value.filter(level => [
      level.name,
      `${level.track.name} ${level.name}`,
      `${level.name} ${level.track.name}`,
    ].some(candidate => normalize(candidate) === target))

    return matches.length === 1 ? matches[0].id : ''
  }

  // Keeps what the user already chose; suggests the rest
  function syncLevelMapping() {
    const next: Record<string, string> = {}
    for (const { value } of levelValues.value) {
      next[value] = levelMapping.value[value] ?? suggestLevel(value)
    }
    levelMapping.value = next
  }

  watch(levelValues, syncLevelMapping)
  watch(courseLevels, () => {
    // Levels arrived after the file was read: fill the suggestions still empty
    for (const { value } of levelValues.value) {
      if (!levelMapping.value[value]) levelMapping.value[value] = suggestLevel(value)
    }
  })

  function request(): ImportRequest {
    return {
      rows: parsed.value?.rows ?? [],
      row_numbers: parsed.value?.row_numbers ?? [],
      mapping: Object.fromEntries(fields.value.map(f => [f, mapping.value[f] ?? null])),
      level_mapping: Object.entries(levelMapping.value).map(([value, id]) => ({ value, course_level_id: id ? Number(id) : null })),
      duplicates: duplicates.value,
    }
  }

  async function run<T>(action: () => Promise<T>, fallback: string): Promise<T | undefined> {
    busy.value = true
    error.value = ''
    try {
      return await action()
    } catch (err) {
      error.value = importErrorMessage(err, fallback)
    } finally {
      busy.value = false
    }
  }

  async function selectFile(file: File) {
    const res = await run(() => importService.parse(type.value, file), t('imports.errors.parse'))
    if (!res) return

    parsed.value = res
    fileName.value = file.name
    mapping.value = { ...res.suggested_mapping }
    levelMapping.value = {}
    syncLevelMapping()
    step.value = 'columns'
  }

  async function loadPreview() {
    const res = await run(() => importService.preview(type.value, request()), t('imports.errors.preview'))
    if (!res) return

    preview.value = res
    statusFilter.value = res.summary.error > 0 ? 'error' : 'all'
    step.value = 'review'
  }

  async function commit() {
    const res = await run(() => importService.commit(type.value, request()), t('imports.errors.commit'))
    if (!res) return

    result.value = res
    step.value = 'result'
  }

  async function downloadTemplate() {
    await run(() => importService.downloadTemplate(type.value, t(`imports.templateFilename.${type.value}`)), t('imports.errors.template'))
  }

  function next() {
    if (step.value === 'columns') {
      if (columnError.value) return
      if (isStudents.value) step.value = 'levels'
      else void loadPreview()
    } else if (step.value === 'levels') {
      void loadPreview()
    } else if (step.value === 'review') {
      void commit()
    }
  }

  function back() {
    error.value = ''
    const index = steps.value.indexOf(step.value)
    if (index > 0) step.value = steps.value[index - 1]
  }

  function setDuplicates(mode: DuplicatesMode) {
    if (duplicates.value === mode) return
    duplicates.value = mode
    void loadPreview()
  }

  // Rows with an error, as in the file plus a column with the reason, so they can be fixed
  // and imported again. ";" and a BOM so Excel in Spanish opens it right.
  function downloadErrorRows() {
    if (!parsed.value || !preview.value) return

    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [[...parsed.value.headers, t('imports.review.reasonColumn')]]
    // The preview rows come in the same order as the parsed ones
    preview.value.rows.forEach((row, i) => {
      if (row.status === 'error') {
        lines.push([...(parsed.value?.rows[i] ?? []), row.errors.map(e => e.message).join(' / ')])
      }
    })

    const csv = '﻿' + lines.map(line => line.map(quote).join(';')).join('\r\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), t('imports.review.errorsFilename', { file: fileName.value.replace(/\.[^.]+$/, '') }))
  }

  function reset() {
    step.value = 'file'
    parsed.value = null
    fileName.value = ''
    mapping.value = {}
    levelMapping.value = {}
    duplicates.value = 'skip'
    preview.value = null
    statusFilter.value = 'all'
    result.value = null
    error.value = ''
  }

  return {
    t, step, steps, parsed, fileName, mapping, levelMapping, duplicates, preview, statusFilter, result, busy, error,
    isStudents, fields, requiredFields, levelGroups, columnError, sampleRows, levelValues, unmappedLevels,
    filteredRows, visibleRows, importableCount,
    selectFile, downloadTemplate, next, back, setDuplicates, downloadErrorRows, reset,
  }
}
