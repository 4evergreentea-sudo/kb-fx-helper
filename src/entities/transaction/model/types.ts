import type { CurrencyCode } from '../../currency'
import type { TransactionType } from '../../rate'

/** 저장된 환전 거래 1건 */
export interface Transaction {
  id: string
  /** ISO 8601 문자열 */
  createdAt: string
  currencyCode: CurrencyCode
  transactionType: TransactionType
  /** 외화금액 */
  amount: number
  /** 기준환율 */
  baseRate: number
  /** 스프레드율(%) */
  spreadRate: number
  /** 우대율(%) */
  preferentialRate: number
  /** 적용환율 */
  appliedRate: number
  /** 원화금액 */
  krwAmount: number
}

/**
 * createTransaction()이 id·생성시각을 만드는 방식을 주입하기 위한 인터페이스.
 * 기본값은 실제 crypto/Date를 사용하고, 테스트에서는 고정값으로 교체할 수 있다.
 */
export interface TransactionClock {
  createId: () => string
  now: () => string
}
