import { describe, it, expect } from 'vitest'
import { getTrackColor } from './trackColor'

describe('getTrackColor', () => {
  it('is stable per track id, numeric or string', () => {
    expect(getTrackColor(1)).toBe(getTrackColor('1'))
  })

  it('cycles through the palette', () => {
    expect(getTrackColor(0)).toBe(getTrackColor(8))
    expect(getTrackColor(1)).not.toBe(getTrackColor(2))
  })

  it('falls back to gray for a non-numeric id', () => {
    expect(getTrackColor('abc')).toBe('#6b7280')
  })
})
