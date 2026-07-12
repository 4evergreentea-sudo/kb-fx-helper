import { SUPPORTED_CURRENCY_CODES } from '../../../shared/model'
import type { Currency, CurrencyCode } from './types'

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', displayName: '미국 달러', unit: 1 },
  EUR: { code: 'EUR', displayName: '유럽 유로', unit: 1 },
  JPY: { code: 'JPY', displayName: '일본 엔', unit: 100 },
  CNY: { code: 'CNY', displayName: '중국 위안', unit: 1 },
}

/** 지원 통화 코드 목록의 단일 소스는 shared/model이며, 여기서는 재노출만 한다 */
export { SUPPORTED_CURRENCY_CODES }
