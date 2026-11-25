import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchChangelog,
  currentVersion,
  groupChangesByType,
  type ChangelogEntry,
  type ChangelogChange,
} from './changelogService'

const entries: ChangelogEntry[] = [
  { version: '1.1.0', fecha: '2026-11-20', titulo: 'Importación', cambios: [{ tipo: 'nuevo', texto: 'Importar alumnos' }] },
  { version: '1.0.0', fecha: '2026-11-01', titulo: 'Primera versión', cambios: [] },
]

// What fetch resolves to: only the parts the service reads
const response = (ok: boolean, json: () => Promise<unknown>) => ({ ok, json }) as Response

const fetchMock = vi.fn()

describe('fetchChangelog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('asks for the static file without the http cache', async () => {
    fetchMock.mockResolvedValue(response(true, async () => []))

    await fetchChangelog()

    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}changelog.json`, { cache: 'no-cache' })
  })

  it('returns the versions in the order of the file', async () => {
    fetchMock.mockResolvedValue(response(true, async () => entries))

    const result = await fetchChangelog()

    expect(result.map((e) => e.version)).toEqual(['1.1.0', '1.0.0'])
    expect(result[0].cambios).toEqual([{ tipo: 'nuevo', texto: 'Importar alumnos' }])
  })

  it('returns [] when the response is not ok', async () => {
    fetchMock.mockResolvedValue(response(false, async () => entries))

    await expect(fetchChangelog()).resolves.toEqual([])
  })

  it('returns [] when the SPA fallback answers index.html', async () => {
    fetchMock.mockResolvedValue(response(true, async () => { throw new SyntaxError('Unexpected token <') }))

    await expect(fetchChangelog()).resolves.toEqual([])
  })

  it('returns [] when the json is not an array', async () => {
    fetchMock.mockResolvedValue(response(true, async () => ({ version: '1.0.0' })))

    await expect(fetchChangelog()).resolves.toEqual([])
  })

  it('returns [] on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchChangelog()).resolves.toEqual([])
  })

  it('skips items without version and defaults missing cambios to []', async () => {
    fetchMock.mockResolvedValue(response(true, async () => [null, { titulo: 'sin versión' }, { version: '1.0.0', fecha: '', titulo: '' }]))

    await expect(fetchChangelog()).resolves.toEqual([{ version: '1.0.0', fecha: '', titulo: '', cambios: [] }])
  })
})

describe('currentVersion', () => {
  it('is the version of the first entry', () => {
    expect(currentVersion(entries)).toBe('1.1.0')
  })

  it('is null without entries', () => {
    expect(currentVersion([])).toBeNull()
  })
})

describe('groupChangesByType', () => {
  it('groups in the order nuevo, mejora, correccion and skips empty groups', () => {
    const cambios: ChangelogChange[] = [
      { tipo: 'correccion', texto: 'Arregla el login' },
      { tipo: 'nuevo', texto: 'Novedades' },
      { tipo: 'correccion', texto: 'Arregla el calendario' },
    ]

    expect(groupChangesByType(cambios)).toEqual([
      { tipo: 'nuevo', cambios: [{ tipo: 'nuevo', texto: 'Novedades' }] },
      {
        tipo: 'correccion',
        cambios: [
          { tipo: 'correccion', texto: 'Arregla el login' },
          { tipo: 'correccion', texto: 'Arregla el calendario' },
        ],
      },
    ])
  })

  it('ignores unknown types', () => {
    const cambios = [{ tipo: 'otro', texto: '?' }, { tipo: 'mejora', texto: 'Más rápido' }] as ChangelogChange[]

    expect(groupChangesByType(cambios)).toEqual([{ tipo: 'mejora', cambios: [{ tipo: 'mejora', texto: 'Más rápido' }] }])
  })
})
