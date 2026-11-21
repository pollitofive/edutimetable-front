import { describe, it, expect, afterEach } from 'vitest'
import { useLoading } from './useLoading'

describe('useLoading', () => {
  afterEach(() => useLoading().hide())

  it('shares the state between callers', () => {
    const a = useLoading()
    const b = useLoading()

    a.show()
    expect(b.isLoading.value).toBe(true)

    b.hide()
    expect(a.isLoading.value).toBe(false)
  })
})
