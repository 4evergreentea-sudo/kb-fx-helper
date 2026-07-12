import type { CurrencyCode, TransactionType } from '../../../shared/model'

/** 거래기록 종류. 환전 거래, 해외송금 거래, 상담 기록(계산 필드 없음)을 구분한다 */
export type RecordType = 'exchange' | 'remittance' | 'consultation'

/** 모든 거래기록(환전/상담)이 공통으로 갖는 필드 */
export interface TransactionRecordBase {
  id: string
  /** ISO 8601 문자열 */
  createdAt: string
  recordType: RecordType
  /** 고객명. 신규 저장 시 필수이며, 과거 데이터에 없으면 빈 문자열로 채워진다(절대 undefined 아님) */
  customerName: string
  currencyCode: CurrencyCode
  /** 외화금액(상담 기록은 상담 대상 금액으로 사용) */
  amount: number
  /** 메모. 환전 기록은 선택, 상담 기록은 필수. 값이 없으면 빈 문자열 */
  memo: string
}

/** 저장된 환전 거래 1건 */
export interface ExchangeTransaction extends TransactionRecordBase {
  recordType: 'exchange'
  transactionType: TransactionType
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

/** 저장된 해외송금 거래 1건 */
export interface RemittanceTransaction extends TransactionRecordBase {
  recordType: 'remittance'
  /** 전신환 매매기준율 */
  baseRate: number
  /** 스프레드율(%) */
  spreadRate: number
  /** 우대율(%) */
  preferentialRate: number
  /** 전신환 적용환율 */
  appliedRate: number
  /** 송금 원금(원화) */
  principalKRW: number
  /** 송금수수료 */
  remittanceFee: number
  /** 전신료 */
  cableFee: number
  /** 총 출금액(원화) = principalKRW + remittanceFee + cableFee */
  totalWithdrawalKRW: number
}

/** 저장된 상담 기록 1건. 계산 필드는 존재하지 않는다 */
export interface ConsultationRecord extends TransactionRecordBase {
  recordType: 'consultation'
}

/** 저장된 거래기록 1건(환전, 해외송금 또는 상담) */
export type Transaction = ExchangeTransaction | RemittanceTransaction | ConsultationRecord

/** createExchangeTransaction() 입력 */
export type CreateExchangeTransactionInput = Omit<ExchangeTransaction, 'id' | 'createdAt'>

/** createRemittanceTransaction() 입력 */
export type CreateRemittanceTransactionInput = Omit<RemittanceTransaction, 'id' | 'createdAt'>

/** createConsultationRecord() 입력 */
export type CreateConsultationRecordInput = Omit<ConsultationRecord, 'id' | 'createdAt'>

/**
 * create*() 함수들이 id·생성시각을 만드는 방식을 주입하기 위한 인터페이스.
 * 기본값은 실제 crypto/Date를 사용하고, 테스트에서는 고정값으로 교체할 수 있다.
 */
export interface TransactionClock {
  createId: () => string
  now: () => string
}
