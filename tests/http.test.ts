import { describe, expect, it } from '@jest/globals'

import { fmtMoney, isPgFkError, isPgUniqueError } from '#/lib/api/http'

describe('fmtMoney', () => {
  it('formats numbers to two decimals', () => {
    expect(fmtMoney(15)).toBe('15.00')
    expect(fmtMoney('9.5')).toBe('9.50')
    expect(fmtMoney(null)).toBe('0.00')
  })
})

describe('pg error helpers', () => {
  it('detects FK and unique violations', () => {
    expect(isPgFkError({ code: '23503' })).toBe(true)
    expect(isPgFkError({ code: '23505' })).toBe(false)
    expect(isPgUniqueError({ code: '23505' })).toBe(true)
  })
})
