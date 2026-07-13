import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fetchEximModule from './lib/fetchEximRates.ts'
import { DELETE, GET, POST, PUT } from './exchange-rates.ts'

const validRates = {
  baseDate: '2026-07-12',
  source: '한국수출입은행',
  rates: {
    USD: 1384.5,
    EUR: 1520.3,
    CNY: 192.5,
    JPY: 945.12,
  },
}

describe('exchange-rates handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.EXIM_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.EXIM_API_KEY
  })

  it('정상 GET 요청 시 200과 정규화 JSON을 반환한다', async () => {
    vi.spyOn(fetchEximModule, 'fetchEximRatesWithLookback').mockResolvedValue(
      validRates,
    )

    const response = await GET(
      new Request('https://example.com/api/exchange-rates'),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(validRates)
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=3600',
    )
  })

  it('POST 요청은 405를 반환한다', async () => {
    const response = await POST()
    expect(response.status).toBe(405)
  })

  it('PUT 요청은 405를 반환한다', async () => {
    const response = await PUT()
    expect(response.status).toBe(405)
  })

  it('DELETE 요청은 405를 반환한다', async () => {
    const response = await DELETE()
    expect(response.status).toBe(405)
  })

  it('잘못된 searchdate 형식은 400을 반환한다', async () => {
    const response = await GET(
      new Request('https://example.com/api/exchange-rates?searchdate=2026071'),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      message: '잘못된 날짜 형식입니다.',
    })
  })

  it('EXIM_API_KEY 미설정 시 503을 반환한다', async () => {
    delete process.env.EXIM_API_KEY

    const response = await GET(
      new Request('https://example.com/api/exchange-rates'),
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      message: '환율 API가 설정되지 않았습니다.',
    })
  })

  it('7일간 모두 데이터가 없으면 404를 반환한다', async () => {
    vi.spyOn(fetchEximModule, 'fetchEximRatesWithLookback').mockResolvedValue(
      null,
    )

    const response = await GET(
      new Request('https://example.com/api/exchange-rates'),
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      message: '최근 7일간 환율 데이터가 없습니다.',
    })
  })

  it('응답 본문에 API 키가 포함되지 않는다', async () => {
    vi.spyOn(fetchEximModule, 'fetchEximRatesWithLookback').mockResolvedValue(
      validRates,
    )

    const response = await GET(
      new Request('https://example.com/api/exchange-rates'),
    )
    const text = await response.text()

    expect(text).not.toContain('test-api-key')
    expect(text).not.toContain('authkey')
  })

  it('오류 응답에 API 키가 포함되지 않는다', async () => {
    delete process.env.EXIM_API_KEY

    const response = await GET(
      new Request('https://example.com/api/exchange-rates'),
    )
    const text = await response.text()

    expect(text).not.toContain('EXIM_API_KEY')
    expect(text).not.toContain('authkey')
  })
})
