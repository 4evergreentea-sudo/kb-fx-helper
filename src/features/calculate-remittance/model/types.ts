import type { CurrencyCode } from '../../../entities/currency'
import type { ValidationResult } from '../../../entities/remittance'

/** createRemittanceCalculator() 입력 */
export interface RemittanceCalculatorInput {
  /** 송금 통화 */
  currencyCode: CurrencyCode
  /** 외화 송금액 */
  foreignAmount: number
  /** 전신환 매매기준율 */
  baseRate: number
  /** 스프레드율(%) */
  spreadRate: number
  /** 우대율(%) */
  preferentialRate: number
  /** 송금수수료 */
  remittanceFee: number
  /** 전신료 */
  cableFee: number
}

/** createRemittanceCalculator() 출력 */
export interface RemittanceCalculatorResult {
  /** 전신환 적용환율. 검증 실패 시 null */
  appliedRate: number | null
  /** 송금 원금(원화). 검증 실패 시 null */
  principalKRW: number | null
  /** 송금수수료. 검증 실패 시 null */
  remittanceFee: number | null
  /** 전신료. 검증 실패 시 null */
  cableFee: number | null
  /** 총 출금액(원화). 검증 실패 시 null */
  totalWithdrawalKRW: number | null
  /** entities/remittance의 검증 함수들을 취합한 결과 */
  validation: ValidationResult
}
