import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_EXCHANGE_RATES_CLIENT_TIMEOUT_MS,
  fetchOfficialExchangeRates,
} from './exchangeRatesClient'

describe('fetchOfficialExchangeRates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('TypeError reject는 network 오류를 던진다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    await expect(fetchOfficialExchangeRates(fetchImpl)).rejects.toMatchObject({
      code: 'network',
    })
  })

  it('Abort 발생 시 timeout 오류를 던진다', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        }),
    )

    const promise = fetchOfficialExchangeRates(fetchImpl, { timeoutMs: 50 })
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' })

    await vi.advanceTimersByTimeAsync(50)
    await assertion
  })

  it('fetch에 AbortSignal을 전달한다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        rates: { USD: 1384.5 },
      }),
    })

    await fetchOfficialExchangeRates(fetchImpl)

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('기본 timeout은 8초이다', () => {
    expect(DEFAULT_EXCHANGE_RATES_CLIENT_TIMEOUT_MS).toBe(8000)
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

  it('옵션 객체의 fetchImpl이 실제 호출된다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        rates: { USD: 1384.5 },
      }),
    })
    const globalFetch = vi.fn()

    await fetchOfficialExchangeRates({
      fetchImpl,
      timeoutMs: 1000,
    })

    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('옵션 객체에서 fetchImpl 생략 시 global fetch를 사용한다', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        baseDate: '2026-07-12',
        source: '한국수출입은행',
        rates: { USD: 1384.5 },
      }),
    })
    globalThis.fetch = fetchMock as typeof fetch

    try {
      await fetchOfficialExchangeRates({ timeoutMs: 1000 })
      expect(fetchMock).toHaveBeenCalledOnce()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('2인자 호출 방식에서 fetchImpl과 timeoutMs를 사용한다', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        }),
    )

    const promise = fetchOfficialExchangeRates(fetchImpl, { timeoutMs: 30 })
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' })

    await vi.advanceTimersByTimeAsync(30)
    await assertion
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
