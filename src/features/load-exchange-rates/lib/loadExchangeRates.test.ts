import { describe, expect, it, vi } from 'vitest'
import { ExchangeRatesClientError } from '../../../shared/api'
import { loadOfficialExchangeRate } from './loadExchangeRates'

const officialRates = {
  baseDate: '2026-07-12',
  source: '한국수출입은행',
  rates: {
    USD: 1384.5,
    EUR: 1520.3,
    CNY: 192.5,
    JPY: 945.12,
  },
}

describe('loadOfficialExchangeRate', () => {
  it('API 성공 시 baseRate를 반환하고 캐시를 저장한다', async () => {
    const saveCache = vi.fn().mockReturnValue(true)

    const result = await loadOfficialExchangeRate('USD', {
      fetchOfficialExchangeRates: vi.fn().mockResolvedValue(officialRates),
      saveCache,
      now: () => new Date('2026-07-13T03:00:00.000Z'),
    })

    expect(result).toEqual({
      status: 'success',
      baseRate: 1384.5,
      metadata: {
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        fromCache: false,
      },
    })
    expect(saveCache).toHaveBeenCalledOnce()
  })

  it('API 실패 + 7일 이내 캐시가 있으면 fallback한다', async () => {
    const result = await loadOfficialExchangeRate('USD', {
      fetchOfficialExchangeRates: vi
        .fn()
        .mockRejectedValue(
          new ExchangeRatesClientError('network', '네트워크 오류', 0),
        ),
      readCache: () => ({
        baseDate: '2026-07-10',
        fetchedAt: '2026-07-12T03:00:00.000Z',
        source: '한국수출입은행',
        rates: { USD: 1370.0 },
      }),
      now: () => new Date('2026-07-13T03:00:00.000Z'),
    })

    expect(result).toMatchObject({
      status: 'fallback',
      baseRate: 1370,
      metadata: {
        baseDate: '2026-07-10',
        fromCache: true,
      },
      message: '최신 환율이 아닐 수 있습니다. 마지막 저장 환율을 사용합니다.',
    })
  })

  it('API 실패 + 7일 초과 캐시는 거부한다', async () => {
    const result = await loadOfficialExchangeRate('USD', {
      fetchOfficialExchangeRates: vi
        .fn()
        .mockRejectedValue(
          new ExchangeRatesClientError('network', '네트워크 오류', 0),
        ),
      readCache: () => ({
        baseDate: '2026-06-01',
        fetchedAt: '2026-06-01T03:00:00.000Z',
        source: '한국수출입은행',
        rates: { USD: 1300 },
      }),
      now: () => new Date('2026-07-13T03:00:00.000Z'),
    })

    expect(result).toEqual({
      status: 'error',
      message: '저장된 환율이 만료되었습니다. 수동으로 입력해주세요.',
    })
  })

  it('API 실패 + 캐시 없음이면 error를 반환한다', async () => {
    const result = await loadOfficialExchangeRate('USD', {
      fetchOfficialExchangeRates: vi
        .fn()
        .mockRejectedValue(
          new ExchangeRatesClientError('not_found', '데이터 없음', 404),
        ),
      readCache: () => null,
    })

    expect(result.status).toBe('error')
  })

  it('선택 통화가 응답에 없으면 error를 반환한다', async () => {
    const result = await loadOfficialExchangeRate('USD', {
      fetchOfficialExchangeRates: vi.fn().mockResolvedValue({
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        rates: { EUR: 1520.3 },
      }),
    })

    expect(result).toEqual({
      status: 'error',
      message: '선택한 통화의 환율을 찾을 수 없습니다.',
    })
  })

  it('JPY(100) 기준 응답을 JPY baseRate로 반환한다', async () => {
    const result = await loadOfficialExchangeRate('JPY', {
      fetchOfficialExchangeRates: vi.fn().mockResolvedValue(officialRates),
      saveCache: vi.fn(),
      now: () => new Date('2026-07-13T03:00:00.000Z'),
    })

    expect(result).toMatchObject({
      status: 'success',
      baseRate: 945.12,
    })
  })
})
