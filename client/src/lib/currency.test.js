import { describe, expect, it } from 'vitest'
import { formatCurrency } from './currency'

describe('formatCurrency', () => {
  it('uses the Indian rupee symbol and lakh grouping', () => {
    expect(formatCurrency(1245000)).toBe('₹12,45,000.00')
  })

  it('keeps displayed amounts in INR without changing their numeric value', () => {
    expect(formatCurrency(89, 'USD')).toBe('₹89.00')
  })
})
