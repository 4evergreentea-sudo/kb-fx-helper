import { describe, expect, it, vi } from 'vitest'
import { fetchOfficialExchangeRates } from './exchangeRatesClient'

describe('fetchOfficialExchangeRates', () => {
  it('200 응답을 파싱한다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        rates: { USD: 1384.5 },
      }),
    })

    const result = await fetchOfficialExchangeRates(fetchImpl)

    expect(result.baseDate).toBe('2026-07-12')
    expect(result.rates.USD).toBe(1384.5)
  })

  it('404 응답 시 ExchangeRatesClientError를 던진다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: '최근 7일간 환율 데이터가 없습니다.' }),
    })

    await expect(fetchOfficialExchangeRates(fetchImpl)).rejects.toMatchObject({
      code: 'not_found',
      status: 404,
    })
  })

  it('malformed JSON은 invalid_response 오류를 던진다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token')
      },
    })

    await expect(fetchOfficialExchangeRates(fetchImpl)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('응답에 API 키 문자열이 포함되지 않는다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        rates: { USD: 1384.5 },
      }),
    })

    const result = await fetchOfficialExchangeRates(fetchImpl)
    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('authkey')
    expect(serialized).not.toContain('EXIM_API_KEY')
  })
})
