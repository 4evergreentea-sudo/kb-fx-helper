import type { CurrencyCode } from '../../../shared/model'
import {
  ExchangeRatesClientError,
  fetchOfficialExchangeRates,
} from '../../../shared/api'
import type { LoadExchangeRatesResult } from '../model/types'
import {
  isCacheValid,
  readExchangeRatesCache,
  saveExchangeRatesCache,
} from './exchangeRatesCache'

const FALLBACK_MESSAGE =
  '최신 환율이 아닐 수 있습니다. 마지막 저장 환율을 사용합니다.'
const STALE_CACHE_MESSAGE =
  '저장된 환율이 만료되었습니다. 수동으로 입력해주세요.'

export interface LoadOfficialExchangeRateDeps {
  fetchOfficialExchangeRates?: typeof fetchOfficialExchangeRates
  readCache?: typeof readExchangeRatesCache
  saveCache?: typeof saveExchangeRatesCache
  isCacheValidFn?: typeof isCacheValid
  now?: () => Date
}

/** 선택 통화의 공식 환율을 조회하고 성공/실패/fallback 결과를 반환한다 */
export async function loadOfficialExchangeRate(
  currencyCode: CurrencyCode,
  deps: LoadOfficialExchangeRateDeps = {},
): Promise<LoadExchangeRatesResult> {
  const fetchRates = deps.fetchOfficialExchangeRates ?? fetchOfficialExchangeRates
  const readCache = deps.readCache ?? readExchangeRatesCache
  const saveCache = deps.saveCache ?? saveExchangeRatesCache
  const validateCache = deps.isCacheValidFn ?? isCacheValid
  const now = deps.now ?? (() => new Date())

  try {
    const officialRates = await fetchRates()
    const baseRate = officialRates.rates[currencyCode]

    if (baseRate === undefined) {
      return {
        status: 'error',
        message: '선택한 통화의 환율을 찾을 수 없습니다.',
      }
    }

    saveCache({
      baseDate: officialRates.baseDate,
      fetchedAt: now().toISOString(),
      source: officialRates.source,
      rates: officialRates.rates,
    })

    return {
      status: 'success',
      baseRate,
      metadata: {
        baseDate: officialRates.baseDate,
        source: officialRates.source,
        fromCache: false,
      },
    }
  } catch (error) {
    const cache = readCache()

    if (cache && validateCache(cache.fetchedAt, now())) {
      const cachedRate = cache.rates[currencyCode]

      if (cachedRate !== undefined) {
        return {
          status: 'fallback',
          baseRate: cachedRate,
          metadata: {
            baseDate: cache.baseDate,
            source: cache.source,
            fromCache: true,
          },
          message: FALLBACK_MESSAGE,
        }
      }
    }

    if (cache && !validateCache(cache.fetchedAt, now())) {
      return {
        status: 'error',
        message: STALE_CACHE_MESSAGE,
      }
    }

    if (error instanceof ExchangeRatesClientError) {
      return {
        status: 'error',
        message: error.message,
      }
    }

    return {
      status: 'error',
      message: '네트워크 오류로 환율을 불러오지 못했습니다.',
    }
  }
}
