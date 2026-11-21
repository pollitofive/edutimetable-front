// Base example of a component spec: mount it, drive it and assert on the DOM.
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LoadingOverlay from './LoadingOverlay.vue'
import { useLoading } from '@/composables/useLoading'

// Child components that don't matter for the test are stubbed (LoadingIcon
// also reads the theme colors, which jsdom doesn't have)
const global = { stubs: { LoadingIcon: true, transition: false } }

describe('LoadingOverlay', () => {
  // useLoading is a module-level singleton: leave it hidden for the next spec
  afterEach(() => useLoading().hide())

  it('is hidden by default', () => {
    const wrapper = mount(LoadingOverlay, { global })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('shows and hides with useLoading', async () => {
    // transition: false renders the content synchronously, without waiting for the animation
    const wrapper = mount(LoadingOverlay, { global })
    const { show, hide } = useLoading()

    show()
    await nextTick()
    expect(wrapper.find('.fixed').exists()).toBe(true)

    hide()
    await nextTick()
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })
})
