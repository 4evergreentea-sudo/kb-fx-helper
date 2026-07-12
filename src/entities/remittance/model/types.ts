/** applyRemittanceRate() 입력 */
export interface ApplyRemittanceRateParams {
  /** 전신환 매매기준율 */
  baseRate: number
  /** 스프레드율(%) */
  spreadRate: number
  /** 우대율(%) */
  preferentialRate: number
}

/** calculateRemittancePrincipal() 입력 */
export interface CalculateRemittancePrincipalParams {
  /** 외화 송금액 */
  foreignAmount: number
  /** 적용환율 */
  appliedRate: number
  /** 통화단위. JPY는 100, 나머지는 1 */
  unit: number
}

/** calculateTotalWithdrawal() 입력 */
export interface CalculateTotalWithdrawalParams {
  /** 송금 원금(원화) */
  principalKRW: number
  /** 송금수수료 */
  remittanceFee: number
  /** 전신료 */
  cableFee: number
}

/** validation 함수들의 반환 타입. UI가 boolean과 에러 메시지를 함께 다룰 수 있도록 설계 */
export interface ValidationResult {
  valid: boolean
  message?: string
}
