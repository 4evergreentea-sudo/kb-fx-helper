/** 거래 저장/삭제 등 store 조작의 결과. 실패 시 UI에 보여줄 한국어 메시지를 함께 담는다 */
export interface TransactionOperationResult {
  success: boolean
  message?: string
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
