import { describe, expect, it, vi } from 'vitest'
import { fetchEximRatesWithLookback } from './fetchEximRates.ts'

const validRows = [
  { result: 1, cur_unit: 'USD', deal_bas_r: '1384.50' },
  { result: 1, cur_unit: 'EUR', deal_bas_r: '1520.30' },
  { result: 1, cur_unit: 'CNY', deal_bas_r: '192.50' },
  { result: 1, cur_unit: 'JPY(100)', deal_bas_r: '945.12' },
]

describe('fetchEximRatesWithLookback', () => {
  it('당일 빈 배열 후 전일 데이터를 반환한다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validRows,
      })

    const result = await fetchEximRatesWithLookback({
      apiKey: 'test-key',
      startYyyymmdd: '20260713',
      fetchImpl,
    })

    expect(result?.baseDate).toBe('2026-07-12')
    expect(result?.rates.USD).toBe(1384.5)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('여러 휴일을 건너뛴 이전 날짜에서 성공한다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => validRows })

    const result = await fetchEximRatesWithLookback({
      apiKey: 'test-key',
      startYyyymmdd: '20260713',
      fetchImpl,
    })

    expect(result?.baseDate).toBe('2026-07-10')
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('7일간 모두 빈 응답이면 null을 반환한다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })

    const result = await fetchEximRatesWithLookback({
      apiKey: 'test-key',
      startYyyymmdd: '20260713',
      fetchImpl,
    })

    expect(result).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(8)
  })

  it('전체 timeout 예산 초과 시 timeout 오류를 던진다', async () => {
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

    await expect(
      fetchEximRatesWithLookback({
        apiKey: 'test-key',
        startYyyymmdd: '20260713',
        totalTimeoutMs: 10,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'timeout' })
  })

  it('네트워크 reject 시 network 오류를 던진다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    await expect(
      fetchEximRatesWithLookback({
        apiKey: 'test-key',
        startYyyymmdd: '20260713',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'network' })
  })
})
