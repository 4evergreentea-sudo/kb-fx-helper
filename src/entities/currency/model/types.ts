/** 지원 통화 코드 */
export type CurrencyCode = 'USD' | 'EUR' | 'JPY' | 'CNY'

/** 통화 정보 */
export interface Currency {
  code: CurrencyCode
  displayName: string
  /** 환율 고시 단위. JPY는 100, 나머지는 1 */
  unit: number
}
