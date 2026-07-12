import type { CurrencyCode } from '../../../entities/currency'
import type { TransactionType, ValidationResult } from '../../../entities/rate'

/** createExchangeCalculator() 입력 */
export interface ExchangeCalculatorInput {
  /** 통화 */
  currencyCode: CurrencyCode
  /** 기준환율 */
  baseRate: number
  /** 스프레드율(%) */
  spreadRate: number
  /** 우대율(%) */
  preferentialRate: number
  /** 거래구분 */
  transactionType: TransactionType
  /** 외화금액 */
  amount: number
}

/** createExchangeCalculator() 출력 */
export interface ExchangeCalculatorResult {
  /** 적용환율. 검증 실패 시 null */
  appliedRate: number | null
  /** 원화금액. 검증 실패 시 null */
  krwAmount: number | null
  /** entities/rate의 검증 함수들을 취합한 결과 */
  validation: ValidationResult
}
