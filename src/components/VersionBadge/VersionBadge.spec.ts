import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import VersionBadge from './VersionBadge.vue'
import { useChangelog } from '@/composables/useChangelog'
import { fetchChangelog, type ChangelogEntry } from '@/services/changelogService'

vi.mock('@/services/changelogService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/changelogService')>()),
  fetchChangelog: vi.fn(),
}))

const fetchMock = vi.mocked(fetchChangelog)

const entries: ChangelogEntry[] = [
  { version: '1.1.0', fecha: '2026-11-20', titulo: 'Importación', cambios: [] },
  { version: '1.0.0', fecha: '2026-11-01', titulo: 'Primera versión', cambios: [] },
]

// The modal has its own spec: here it's enough to see what it receives
const mountBadge = () =>
  mount(VersionBadge, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'es', messages: { es } })],
      stubs: { ChangelogModal: true },
    },
  })

describe('VersionBadge', () => {
  beforeEach(() => fetchMock.mockReset())
  // useChangelog is a module-level singleton: forget the cached load for the next spec
  afterEach(() => useChangelog().reset())

  it('shows the version of the first entry', async () => {
    fetchMock.mockResolvedValue(entries)
    const wrapper = mountBadge()
    await flushPromises()

    expect(wrapper.find('[data-testid="layout-version-badge"]').text()).toBe('v1.1.0')
  })

  it('is not rendered without entries', async () => {
    fetchMock.mockResolvedValue([])
    const wrapper = mountBadge()
    await flushPromises()

    expect(wrapper.find('[data-testid="layout-version-badge"]').exists()).toBe(false)
  })

  it('opens the changelog with every entry on click', async () => {
    fetchMock.mockResolvedValue(entries)
    const wrapper = mountBadge()
    await flushPromises()

    const modal = wrapper.findComponent({ name: 'ChangelogModal' })
    expect(modal.props('isVisible')).toBe(false)

    await wrapper.find('[data-testid="layout-version-badge"]').trigger('click')

    expect(modal.props('isVisible')).toBe(true)
    expect(modal.props('entries')).toEqual(entries)
  })

  it('fetches the changelog once per session', async () => {
    fetchMock.mockResolvedValue(entries)
    mountBadge()
    mountBadge()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
