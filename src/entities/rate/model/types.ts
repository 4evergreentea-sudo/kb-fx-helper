/** 거래구분 */
export type TransactionType = 'buy' | 'sell'

/** applyExchangeRate() 입력 */
export interface ApplyExchangeRateParams {
  /** 기준환율 */
  baseRate: number
  /** 스프레드율(%) */
  spreadRate: number
  /** 우대율(%) */
  preferentialRate: number
  /** 거래구분 */
  transactionType: TransactionType
}

/** exchangeToKRW() 입력 */
export interface ExchangeToKRWParams {
  /** 외화금액 */
  amount: number
  /** 적용환율 */
  appliedRate: number
  /** 통화단위 */
  unit: number
}

/** validation 함수들의 반환 타입. UI가 boolean과 에러 메시지를 함께 다룰 수 있도록 설계 */
export interface ValidationResult {
  valid: boolean
  message?: string
}
