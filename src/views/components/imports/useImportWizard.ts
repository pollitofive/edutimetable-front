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
  type ImportType,
  type ParseResult,
  type PreviewResult,
  type RowStatus,
} from '@/services/importService'
import {
  buildRequest, columnProblem, distinctValues, errorRowsCsv, groupLevels,
  sampleRows as firstRows, syncLevelMapping as syncLevels, type CourseLevelOption,
} from './importWizard'

export type WizardStep = 'file' | 'columns' | 'levels' | 'review' | 'result'

const GET_COURSE_LEVELS = gql`
  query GetCourseLevels { courseLevels(first: 100, page: 1) { data { id track { id name } name slug sort_order } } }
`

// Rows listed per status filter in the review step; the totals always count all of them
export const REVIEW_ROWS_LIMIT = 100

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
  const levelGroups = computed(() => groupLevels(courseLevels.value))

  const fields = computed<ImportField[]>(() => parsed.value?.fields ?? [])
  const requiredFields = computed<ImportField[]>(() => isStudents.value ? ['name', 'email', 'level'] : ['name', 'email'])

  const steps = computed<WizardStep[]>(() =>
    isStudents.value ? ['file', 'columns', 'levels', 'review', 'result'] : ['file', 'columns', 'review', 'result']
  )

  const columnError = computed(() => {
    const problem = columnProblem(mapping.value, requiredFields.value)
    if (problem?.kind === 'missing') return t('imports.columns.missing', { fields: problem.fields.map(f => t(`imports.fields.${f}`)).join(', ') })
    if (problem?.kind === 'repeated') return t('imports.columns.repeated')
    return ''
  })

  // First rows of the file, as they would be read with the current mapping
  const sampleRows = computed(() => firstRows(parsed.value?.rows ?? [], fields.value, mapping.value))

  // Distinct values of the level column with how many rows have each
  const levelValues = computed(() => distinctValues(parsed.value?.rows ?? [], mapping.value.level))

  const unmappedLevels = computed(() => levelValues.value.filter(v => !levelMapping.value[v.value]).length)

  const filteredRows = computed(() => {
    const rows = preview.value?.rows ?? []
    return statusFilter.value === 'all' ? rows : rows.filter(r => r.status === statusFilter.value)
  })
  const visibleRows = computed(() => filteredRows.value.slice(0, REVIEW_ROWS_LIMIT))
  const importableCount = computed(() => (preview.value?.summary.new ?? 0) + (preview.value?.summary.update ?? 0))

  function syncLevelMapping(onlyEmpty = false) {
    levelMapping.value = syncLevels(levelValues.value.map(v => v.value), levelMapping.value, courseLevels.value, onlyEmpty)
  }

  watch(levelValues, () => syncLevelMapping())
  // Levels arrived after the file was read: fill the suggestions still empty
  watch(courseLevels, () => syncLevelMapping(true))

  const request = () => buildRequest(parsed.value, fields.value, mapping.value, levelMapping.value, duplicates.value)

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

  // Rows with an error plus the reason, to fix them and import again
  function downloadErrorRows() {
    if (!parsed.value || !preview.value) return

    const csv = errorRowsCsv(parsed.value.headers, parsed.value.rows, preview.value.rows, t('imports.review.reasonColumn'))
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
