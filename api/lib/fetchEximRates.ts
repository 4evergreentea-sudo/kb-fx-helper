import type { OfficialExchangeRates } from '../../src/shared/model/index.js'
import { buildLookbackDates, toBaseDate } from './kstDate.js'
import {
  hasSupportedRates,
  parseEximRates,
  type EximRateRow,
} from './parseEximRates.js'

const OFFICIAL_EXCHANGE_RATES_SOURCE = '한국수출입은행'

const EXIM_API_URL =
  'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON'
export const DEFAULT_TOTAL_TIMEOUT_MS = 8000
export const DEFAULT_LOOKBACK_DAYS = 7

const API_ERROR_MESSAGE = '환율 API에서 오류가 반환되었습니다.'

export type FetchEximRatesErrorCode =
  | 'timeout'
  | 'network'
  | 'api_error'

export class FetchEximRatesError extends Error {
  readonly code: FetchEximRatesErrorCode

  constructor(code: FetchEximRatesErrorCode, message: string) {
    super(message)
    this.name = 'FetchEximRatesError'
    this.code = code
  }
}

export interface FetchEximRatesOptions {
  apiKey: string
  startYyyymmdd: string
  lookbackDays?: number
  totalTimeoutMs?: number
  fetchImpl?: typeof fetch
}

/** 단일 날짜에 대해 Exim API를 호출한다 */
export async function fetchEximRatesForDate(
  apiKey: string,
  searchdate: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<EximRateRow[]> {
  const url = new URL(EXIM_API_URL)
  url.searchParams.set('authkey', apiKey)
  url.searchParams.set('searchdate', searchdate)
  url.searchParams.set('data', 'AP01')

  let response: Response

  try {
    response = await fetchImpl(url.toString(), {
      method: 'GET',
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchEximRatesError('timeout', '환율 조회 시간이 초과되었습니다.')
    }

    throw new FetchEximRatesError(
      'network',
      '환율 서버에 연결하지 못했습니다.',
    )
  }

  if (!response.ok) {
    throw new FetchEximRatesError('api_error', API_ERROR_MESSAGE)
  }

  let rows: unknown

  try {
    rows = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new FetchEximRatesError('api_error', API_ERROR_MESSAGE)
    }

    throw error
  }

  if (!Array.isArray(rows)) {
    throw new FetchEximRatesError('api_error', API_ERROR_MESSAGE)
  }

  return rows as EximRateRow[]
}

/**
 * KST 시작일부터 최대 lookback일까지 역순 조회하여
 * 처음 유효 데이터가 있는 날짜의 정규화 환율을 반환한다.
 */
export async function fetchEximRatesWithLookback({
  apiKey,
  startYyyymmdd,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  totalTimeoutMs = DEFAULT_TOTAL_TIMEOUT_MS,
  fetchImpl = fetch,
}: FetchEximRatesOptions): Promise<OfficialExchangeRates | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), totalTimeoutMs)
  const dates = buildLookbackDates(startYyyymmdd, lookbackDays)

  try {
    for (const searchdate of dates) {
      if (controller.signal.aborted) {
        throw new FetchEximRatesError(
          'timeout',
          '환율 조회 시간이 초과되었습니다.',
        )
      }

      const rows = await fetchEximRatesForDate(
        apiKey,
        searchdate,
        controller.signal,
        fetchImpl,
      )
      const { rates } = parseEximRates(rows)

      if (hasSupportedRates(rates)) {
        return {
          baseDate: toBaseDate(searchdate),
          source: OFFICIAL_EXCHANGE_RATES_SOURCE,
          rates,
        }
      }
    }

    return null
  } catch (error) {
    if (error instanceof FetchEximRatesError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchEximRatesError('timeout', '환율 조회 시간이 초과되었습니다.')
    }

    throw new FetchEximRatesError(
      'network',
      '환율 서버에 연결하지 못했습니다.',
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
