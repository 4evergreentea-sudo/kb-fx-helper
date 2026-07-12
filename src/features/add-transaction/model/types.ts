import type { CurrencyCode, TransactionType } from '../../../shared/model'

/** 거래 저장/삭제 등 store 조작의 결과. 실패 시 UI에 보여줄 한국어 메시지를 함께 담는다 */
export interface TransactionOperationResult {
  success: boolean
  message?: string
}

/**
 * 환전 거래 저장 입력. features/calculate-exchange의 계산기 타입에 의존하지 않는
 * 이 feature 자체의 DTO다(entities/transaction의 도메인 타입과도 분리되어 있다).
 * customerName은 저장 시 trim되어 검증되고, memo는 없으면 빈 문자열로 정규화된다.
 */
export interface AddExchangeTransactionInput {
  customerName: string
  currencyCode: CurrencyCode
  transactionType: TransactionType
  amount: number
  baseRate: number
  spreadRate: number
  preferentialRate: number
  appliedRate: number
  krwAmount: number
  memo?: string
}

/**
 * 해외송금 거래 저장 입력. features/calculate-remittance의 계산기 타입에 의존하지 않는
 * 이 feature 자체의 DTO다(entities/transaction의 도메인 타입과도 분리되어 있다).
 * Widget이 계산 결과를 이 형태로 조립해 전달한다.
 * customerName은 저장 시 trim되어 검증되고, memo는 없으면 빈 문자열로 정규화된다.
 */
export interface AddRemittanceTransactionInput {
  customerName: string
  currencyCode: CurrencyCode
  /** 외화 송금액 */
  amount: number
  baseRate: number
  spreadRate: number
  preferentialRate: number
  appliedRate: number
  principalKRW: number
  remittanceFee: number
  cableFee: number
  totalWithdrawalKRW: number
  memo?: string
}

/**
 * 상담 기록 저장 입력. 다음 phase(상담 기록 입력 UI)에서 바로 사용할 수 있도록
 * 이번 phase에서 완전히 구현해 둔다.
 */
export interface AddConsultationInput {
  customerName: string
  currencyCode: CurrencyCode
  amount: number
  memo: string
}

/** Supabase 동기화 진행 상태 */
export type SyncPhase = 'idle' | 'syncing' | 'synced' | 'error'

/** 클라우드 동기화 상태. localStorage 저장 자체와는 무관하며 Supabase 연동 여부만 나타낸다 */
export interface SyncState {
  /** 환경변수/client 설정 여부. false면 앱은 localStorage만 사용하고 이후 필드는 항상 idle 상태다 */
  isSupabaseEnabled: boolean
  /** 현재 원격 동기화(조회/추가 재시도/삭제 재시도)가 진행 중인지 여부 */
  isSyncing: boolean
  phase: SyncPhase
  /** 진행/성공 시 사용자에게 보여줄 한국어 메시지. phase가 'error'가 아니면 채워질 수 있다 */
  syncMessage: string | null
  /** 실패 시 사용자에게 보여줄 한국어 메시지. phase가 'error'일 때만 채워진다 */
  syncError: string | null
}
