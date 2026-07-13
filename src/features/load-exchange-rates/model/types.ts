import type { CurrencyCode } from '../../../shared/model'

export type LoadExchangeRatesStatus = 'idle' | 'loading' | 'success' | 'fallback' | 'error'

export interface LoadExchangeRatesMetadata {
  baseDate: string
  source: string
  fromCache: boolean
}

export type LoadExchangeRatesResult =
  | {
      status: 'success'
      baseRate: number
      metadata: LoadExchangeRatesMetadata
    }
  | {
      status: 'fallback'
      baseRate: number
      metadata: LoadExchangeRatesMetadata
      message: string
    }
  | {
      status: 'error'
      message: string
    }

export interface LoadOfficialRateInput {
  currencyCode: CurrencyCode
}
