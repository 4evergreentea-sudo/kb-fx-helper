import { describe, expect, it } from 'vitest'
import { hasSupportedRates, parseEximRates } from './parseEximRates.ts'

describe('parseEximRates', () => {
  it('USD/EUR/CNY/JPY(100)를 정상 파싱한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'USD', deal_bas_r: '1,384.50' },
      { result: 1, cur_unit: 'EUR', deal_bas_r: '1520.30' },
      { result: 1, cur_unit: 'CNY', deal_bas_r: '192.50' },
      { result: 1, cur_unit: 'JPY(100)', deal_bas_r: '945.12' },
    ])

    expect(result.rates).toEqual({
      USD: 1384.5,
      EUR: 1520.3,
      CNY: 192.5,
      JPY: 945.12,
    })
  })

  it('CNH를 CNY로 매핑한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'CNH', deal_bas_r: '193.10' },
    ])

    expect(result.rates.CNY).toBe(193.1)
  })

  it('CNY를 CNY로 매핑한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'CNY', deal_bas_r: '191.00' },
    ])

    expect(result.rates.CNY).toBe(191)
  })

  it('JPY(100)를 100엔 기준값 그대로 JPY로 매핑한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'JPY(100)', deal_bas_r: '945.12' },
    ])

    expect(result.rates.JPY).toBe(945.12)
  })

  it('JPY 단독 표기는 제외한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'JPY', deal_bas_r: '9.45' },
    ])

    expect(result.rates.JPY).toBeUndefined()
  })

  it('JPY(1)은 제외한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'JPY(1)', deal_bas_r: '9.45' },
    ])

    expect(result.rates.JPY).toBeUndefined()
  })

  it('deal_bas_r가 숫자가 아니면 해당 통화를 누락한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'USD', deal_bas_r: 'abc' },
    ])

    expect(result.rates.USD).toBeUndefined()
    expect(hasSupportedRates(result.rates)).toBe(false)
  })

  it('지원하지 않는 통화는 무시한다', () => {
    const result = parseEximRates([
      { result: 1, cur_unit: 'GBP', deal_bas_r: '1800.00' },
    ])

    expect(result.rates).toEqual({})
  })

  it('result가 1이 아닌 행은 무시한다', () => {
    const result = parseEximRates([
      { result: 4, cur_unit: 'USD', deal_bas_r: '1384.50' },
    ])

    expect(result.rates).toEqual({})
  })
})
