import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from '@/api/http'
import { importService, importErrorMessage, type ImportRequest } from './importService'

vi.mock('@/api/http', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)

const body: ImportRequest = {
  rows: [['Lucía', 'lucia@x.com']],
  row_numbers: [2],
  mapping: { name: 0, email: 1, phone: null },
  level_mapping: [],
  duplicates: 'skip',
}

describe('importService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('parse uploads the file as multipart to the type endpoint', async () => {
    post.mockResolvedValue({ data: { headers: ['Nombre'] } })
    const file = new File(['Nombre\nLucía'], 'alumnos.csv', { type: 'text/csv' })

    await expect(importService.parse('students', file)).resolves.toEqual({ headers: ['Nombre'] })

    const [url, form] = post.mock.calls[0]
    expect(url).toBe('/imports/students/parse')
    expect((form as FormData).get('file')).toBe(file)
  })

  it('preview and commit post the request', async () => {
    post.mockResolvedValue({ data: { created: 1 } })

    await importService.preview('teachers', body)
    await expect(importService.commit('teachers', body)).resolves.toEqual({ created: 1 })

    expect(post).toHaveBeenNthCalledWith(1, '/imports/teachers/preview', body)
    expect(post).toHaveBeenNthCalledWith(2, '/imports/teachers/commit', body)
  })

  it('downloadTemplate asks for a blob and saves it with the given name', async () => {
    get.mockResolvedValue({ data: new Blob(['xlsx']) })
    URL.createObjectURL = vi.fn(() => 'blob:template')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await importService.downloadTemplate('students', 'plantilla-alumnos.xlsx')

    expect(get).toHaveBeenCalledWith('/imports/students/template', { responseType: 'blob' })
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('plantilla-alumnos.xlsx')
    expect(link.href).toBe('blob:template')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:template')
  })
})

describe('importErrorMessage', () => {
  it('prefers the first validation error', () => {
    const err = { response: { data: { message: 'The given data was invalid.', errors: { file: ['El archivo debe ser xlsx o csv.'] } } } }

    expect(importErrorMessage(err, 'fallback')).toBe('El archivo debe ser xlsx o csv.')
  })

  it('then the api message (a file that cannot be read)', () => {
    expect(importErrorMessage({ response: { data: { message: 'El archivo está vacío.', code: 'empty' } } }, 'fallback')).toBe('El archivo está vacío.')
  })

  it('falls back without a response (network error)', () => {
    expect(importErrorMessage(new Error('Network Error'), 'No se pudo leer el archivo.')).toBe('No se pudo leer el archivo.')
  })
})
