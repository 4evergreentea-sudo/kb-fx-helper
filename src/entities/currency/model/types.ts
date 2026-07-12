import type { CurrencyCode } from '../../../shared/model'

/** 지원 통화 코드. 실제 정의는 entities 간 순환 의존을 막기 위해 shared/model에 있다 */
export type { CurrencyCode }

/** 통화 정보 */
export interface Currency {
  code: CurrencyCode
  displayName: string
  /** 환율 고시 단위. JPY는 100, 나머지는 1 */
  unit: number
}
