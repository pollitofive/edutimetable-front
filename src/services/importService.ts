import http from '@/api/http'

export type ImportType = 'students' | 'teachers'
export type ImportField = 'name' | 'email' | 'phone' | 'level'
export type DuplicatesMode = 'skip' | 'update'
export type RowStatus = 'new' | 'update' | 'skip' | 'error'

// Column of the file for each field (null: not imported)
export type ColumnMapping = Partial<Record<ImportField, number | null>>

export interface ParseResult {
  headers: string[]
  rows: string[][]
  // Spreadsheet row of each row (empty rows of the file are left out)
  row_numbers: number[]
  fields: ImportField[]
  suggested_mapping: ColumnMapping
  level_values: Array<{ value: string; count: number }>
}

export interface ImportRequest {
  rows: string[][]
  row_numbers: number[]
  mapping: ColumnMapping
  // Each distinct level of the file → course level (students only)
  level_mapping: Array<{ value: string; course_level_id: number | null }>
  duplicates: DuplicatesMode
}

export interface RowError {
  field: ImportField
  code: string
  message: string
}

export interface PreviewRow {
  // Row number in the spreadsheet
  row: number
  status: RowStatus
  data: { name: string; email: string; phone: string; level?: string; course_level_id?: number | null }
  errors: RowError[]
  existing_id: number | null
}

export interface PreviewResult {
  summary: Record<RowStatus, number>
  rows: PreviewRow[]
}

export interface CommitResult {
  created: number
  updated: number
  skipped: number
  rejected: number
}

export const importService = {
  async parse(type: ImportType, file: File): Promise<ParseResult> {
    const form = new FormData()
    form.append('file', file)
    const res = await http.post(`/imports/${type}/parse`, form)
    return res.data
  },

  async preview(type: ImportType, body: ImportRequest): Promise<PreviewResult> {
    const res = await http.post(`/imports/${type}/preview`, body)
    return res.data
  },

  async commit(type: ImportType, body: ImportRequest): Promise<CommitResult> {
    const res = await http.post(`/imports/${type}/commit`, body)
    return res.data
  },

  // The template is an xlsx with the expected headers. The name is passed in because the
  // api is cross-origin and doesn't expose Content-Disposition.
  async downloadTemplate(type: ImportType, filename: string): Promise<void> {
    const res = await http.get(`/imports/${type}/template`, { responseType: 'blob' })
    downloadBlob(res.data, filename)
  },
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Message of a failed request: the api's message (a file that can't be read, a validation
// error) or the fallback
export function importErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data
  const firstValidation = data?.errors ? (Object.values(data.errors)[0] as string[])?.[0] : undefined
  return firstValidation ?? data?.message ?? fallback
}
