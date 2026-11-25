// Release notes written by /release into public/changelog.json, served as a
// static file next to the SPA (not through the api).

export type ChangeType = 'nuevo' | 'mejora' | 'correccion'

export interface ChangelogChange {
  tipo: ChangeType
  texto: string
}

export interface ChangelogEntry {
  version: string
  fecha: string
  titulo: string
  cambios: ChangelogChange[]
}

export interface ChangeGroup {
  tipo: ChangeType
  cambios: ChangelogChange[]
}

export const CHANGE_TYPES: ChangeType[] = ['nuevo', 'mejora', 'correccion']

const isEntry = (value: unknown): value is ChangelogEntry =>
  typeof value === 'object' && value !== null && typeof (value as ChangelogEntry).version === 'string'

/**
 * Loads the changelog. Never throws: a missing file (the SPA fallback answers
 * index.html with 200), invalid JSON or anything that is not an array gives [].
 */
export async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}changelog.json`, { cache: 'no-cache' })
    if (!response.ok) return []

    const data: unknown = await response.json()
    if (!Array.isArray(data)) return []

    return data.filter(isEntry).map((entry) => ({
      ...entry,
      cambios: Array.isArray(entry.cambios) ? entry.cambios : [],
    }))
  } catch {
    return []
  }
}

/** The newest version is the first entry. */
export function currentVersion(entries: ChangelogEntry[]): string | null {
  return entries[0]?.version ?? null
}

/** Groups in a fixed order (nuevo, mejora, correccion), skipping empty groups and unknown types. */
export function groupChangesByType(cambios: ChangelogChange[]): ChangeGroup[] {
  return CHANGE_TYPES
    .map((tipo) => ({ tipo, cambios: cambios.filter((cambio) => cambio.tipo === tipo) }))
    .filter((group) => group.cambios.length > 0)
}
