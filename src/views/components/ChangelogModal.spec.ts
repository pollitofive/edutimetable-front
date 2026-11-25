import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import ChangelogModal from './ChangelogModal.vue'
import type { ChangelogEntry } from '@/services/changelogService'

// The headless Dialog teleports and animates: a plain wrapper is enough to test the content
const passthrough = (name: string) =>
  defineComponent({ name, inheritAttrs: false, setup: (_, { slots, attrs }) => () => h('div', attrs, slots.default?.()) })

const DialogStub = defineComponent({
  name: 'Dialog',
  props: { open: Boolean },
  setup: (props, { slots }) => () => (props.open ? h('div', slots.default?.()) : null),
})

const mountModal = (entries: ChangelogEntry[], isVisible = true) =>
  mount(ChangelogModal, {
    props: { isVisible, entries },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'es', messages: { es } })],
      stubs: { Dialog: DialogStub, Panel: passthrough('Panel'), Title: passthrough('Title'), Lucide: true },
    },
  })

const entries: ChangelogEntry[] = [
  {
    version: '1.2.0',
    fecha: '2026-11-20',
    titulo: 'Importación',
    cambios: [
      { tipo: 'correccion', texto: 'Arregla el login' },
      { tipo: 'nuevo', texto: 'Importar alumnos' },
      { tipo: 'nuevo', texto: 'Importar profesores' },
    ],
  },
  { version: '1.1.0', fecha: '2026-11-10', titulo: 'Mejoras', cambios: [{ tipo: 'mejora', texto: 'Más rápido' }] },
  { version: '1.0.0', fecha: '2026-11-01', titulo: 'Primera versión', cambios: [] },
]

describe('ChangelogModal', () => {
  it('lists every version in order', () => {
    const wrapper = mountModal(entries)

    const rendered = wrapper.findAll('[data-testid="changelog-entry"]')
    expect(rendered).toHaveLength(3)
    expect(rendered.map((e) => e.find('[data-testid="changelog-entry-version"]').text())).toEqual(['v1.2.0', 'v1.1.0', 'v1.0.0'])
    expect(rendered[0].text()).toContain('Importación')
    expect(rendered[0].text()).toContain('2026-11-20')
  })

  it('groups the changes by type in a fixed order', () => {
    const first = mountModal(entries).findAll('[data-testid="changelog-entry"]')[0]

    const groups = first.findAll('[data-testid^="changelog-group-"]')
    expect(groups.map((g) => g.attributes('data-testid'))).toEqual(['changelog-group-nuevo', 'changelog-group-correccion'])
    expect(groups[0].text()).toContain('Nuevo')
    expect(groups[0].findAll('li').map((li) => li.text())).toEqual(['Importar alumnos', 'Importar profesores'])
    expect(groups[1].findAll('li').map((li) => li.text())).toEqual(['Arregla el login'])
  })

  it('shows the empty state without entries', () => {
    const wrapper = mountModal([])

    expect(wrapper.find('[data-testid="changelog-empty"]').text()).toBe(es.changelog.empty)
    expect(wrapper.findAll('[data-testid="changelog-entry"]')).toHaveLength(0)
  })

  it('renders nothing when closed', () => {
    expect(mountModal(entries, false).find('[data-testid="changelog-modal"]').exists()).toBe(false)
  })

  it('emits close from the close button', async () => {
    const wrapper = mountModal(entries)

    await wrapper.find('[data-testid="changelog-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
