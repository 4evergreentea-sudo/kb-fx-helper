import type { CurrencyCode } from './currencyCode'

/** 서버가 반환하는 정규화된 공식 환율 응답 (Exim 원시 스키마 미포함) */
export interface OfficialExchangeRates {
  baseDate: string
  source: string
  rates: Partial<Record<CurrencyCode, number>>
}

/** localStorage에 저장하는 환율 스냅샷 */
export interface ExchangeRatesCacheSnapshot {
  baseDate: string
  fetchedAt: string
  source: string
  rates: Partial<Record<CurrencyCode, number>>
}

export const OFFICIAL_EXCHANGE_RATES_SOURCE = '한국수출입은행'
