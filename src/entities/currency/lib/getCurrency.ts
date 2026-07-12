import { CURRENCIES } from '../model/currencies'
import type { Currency, CurrencyCode } from '../model/types'

/**
 * 통화 코드로 통화 정보를 조회한다.
 * 지원하지 않는 코드가 들어오면 예외를 던진다.
 */
export function getCurrency(code: CurrencyCode): Currency {
  const currency = CURRENCIES[code]

  if (!currency) {
    throw new Error(`지원하지 않는 통화 코드입니다: ${code}`)
  }

  return currency
}
