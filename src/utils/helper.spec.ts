import { describe, it, expect } from 'vitest'
import {
  capitalizeFirstLetter, onlyNumber, formatCurrency, formatAmount, formatDateForInput, formatDateForInputSpanish,
} from './helper'

describe('text helpers', () => {
  it('capitalizeFirstLetter', () => {
    expect(capitalizeFirstLetter('lunes')).toBe('Lunes')
    expect(capitalizeFirstLetter('')).toBe('')
  })

  it('onlyNumber keeps the digits', () => {
    expect(onlyNumber('+54 (11) 1234-5678')).toBe('541112345678')
  })
})

describe('number helpers', () => {
  it('formatCurrency groups thousands with dots', () => {
    expect(formatCurrency(1234567)).toBe('1.234.567')
    expect(formatCurrency(999)).toBe('999')
  })

  it('formatAmount uses dot for thousands and comma for decimals', () => {
    expect(formatAmount(1234.5)).toBe('1.234,50')
    expect(formatAmount('1000')).toBe('1.000,00')
    expect(formatAmount(0)).toBe('0,00')
  })
})

describe('date helpers', () => {
  it('formatDateForInput', () => {
    expect(formatDateForInput('2026-11-23')).toBe('23 Nov 2026')
    expect(formatDateForInput(null)).toBe('01 Jan 2000')
  })

  it('formatDateForInputSpanish', () => {
    expect(formatDateForInputSpanish('2026-11-23 18:30:00')).toBe('23/11/2026 18:30:00')
    expect(formatDateForInputSpanish(null)).toBe('')
  })
})
