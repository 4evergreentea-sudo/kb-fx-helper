import type { Currency, CurrencyCode } from './types'

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', displayName: '미국 달러', unit: 1 },
  EUR: { code: 'EUR', displayName: '유럽 유로', unit: 1 },
  JPY: { code: 'JPY', displayName: '일본 엔', unit: 100 },
  CNY: { code: 'CNY', displayName: '중국 위안', unit: 1 },
}

export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] = Object.keys(
  CURRENCIES,
) as CurrencyCode[]
