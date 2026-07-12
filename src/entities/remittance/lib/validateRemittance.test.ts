import { describe, expect, it } from 'vitest'
import {
  validateBaseRate,
  validateCableFee,
  validateForeignAmount,
  validatePreferentialRate,
  validateRemittanceFee,
  validateSpreadRate,
} from './validateRemittance'

describe('validateForeignAmount', () => {
  it('0보다 큰 값이면 valid: true를 반환한다', () => {
    expect(validateForeignAmount(1000)).toEqual({ valid: true })
  })

  it('0이면 valid: false를 반환한다', () => {
    expect(validateForeignAmount(0).valid).toBe(false)
  })

  it('음수이면 valid: false를 반환한다', () => {
    expect(validateForeignAmount(-1).valid).toBe(false)
  })

  it('NaN이면 valid: false를 반환한다', () => {
    expect(validateForeignAmount(NaN).valid).toBe(false)
  })

  it('Infinity이면 valid: false를 반환한다', () => {
    expect(validateForeignAmount(Infinity).valid).toBe(false)
  })
})

describe('validateBaseRate', () => {
  it('0보다 큰 값이면 valid: true를 반환한다', () => {
    expect(validateBaseRate(1400).valid).toBe(true)
  })

  it('경계값 0.01이면 valid: true를 반환한다', () => {
    expect(validateBaseRate(0.01).valid).toBe(true)
  })

  it('0이면 valid: false를 반환한다', () => {
    expect(validateBaseRate(0).valid).toBe(false)
  })

  it('음수이면 valid: false를 반환한다', () => {
    expect(validateBaseRate(-100).valid).toBe(false)
  })

  it('NaN이면 valid: false를 반환한다', () => {
    expect(validateBaseRate(NaN).valid).toBe(false)
  })

  it('Infinity이면 valid: false를 반환한다', () => {
    expect(validateBaseRate(Infinity).valid).toBe(false)
  })
})

describe('validateSpreadRate', () => {
  it('0 이상이면 valid: true를 반환한다', () => {
    expect(validateSpreadRate(1.75).valid).toBe(true)
  })

  it('경계값 0이면 valid: true를 반환한다', () => {
    expect(validateSpreadRate(0).valid).toBe(true)
  })

  it('음수이면 valid: false를 반환한다', () => {
    expect(validateSpreadRate(-0.01).valid).toBe(false)
  })

  it('NaN이면 valid: false를 반환한다', () => {
    expect(validateSpreadRate(NaN).valid).toBe(false)
  })
})

describe('validatePreferentialRate', () => {
  it('0 이상 100 이하이면 valid: true를 반환한다', () => {
    expect(validatePreferentialRate(80).valid).toBe(true)
  })

  it('경계값 0이면 valid: true를 반환한다', () => {
    expect(validatePreferentialRate(0).valid).toBe(true)
  })

  it('경계값 100이면 valid: true를 반환한다', () => {
    expect(validatePreferentialRate(100).valid).toBe(true)
  })

  it('음수이면 valid: false를 반환한다', () => {
    expect(validatePreferentialRate(-1).valid).toBe(false)
  })

  it('100을 초과하면 valid: false를 반환한다', () => {
    expect(validatePreferentialRate(100.01).valid).toBe(false)
  })

  it('Infinity이면 valid: false를 반환한다', () => {
    expect(validatePreferentialRate(Infinity).valid).toBe(false)
  })
})

describe('validateRemittanceFee', () => {
  it('0 이상이면 valid: true를 반환한다', () => {
    expect(validateRemittanceFee(5000).valid).toBe(true)
  })

  it('경계값 0이면 valid: true를 반환한다', () => {
    expect(validateRemittanceFee(0).valid).toBe(true)
  })

  it('음수이면 valid: false를 반환한다', () => {
    expect(validateRemittanceFee(-1).valid).toBe(false)
  })

  it('NaN이면 valid: false를 반환한다', () => {
    expect(validateRemittanceFee(NaN).valid).toBe(false)
  })
})

describe('validateCableFee', () => {
  it('0 이상이면 valid: true를 반환한다', () => {
    expect(validateCableFee(8000).valid).toBe(true)
  })

  it('경계값 0이면 valid: true를 반환한다', () => {
    expect(validateCableFee(0).valid).toBe(true)
  })

  it('음수이면 valid: false를 반환한다', () => {
    expect(validateCableFee(-1).valid).toBe(false)
  })

  it('Infinity이면 valid: false를 반환한다', () => {
    expect(validateCableFee(Infinity).valid).toBe(false)
  })
})
