export interface SyncStatusLabelInput {
  isSupabaseEnabled: boolean
  isSyncing: boolean
  syncMessage: string | null
  syncError: string | null
}

/**
 * 동기화 상태를 화면에 보여줄 한국어 문구 하나로 변환한다.
 * 우선순위: Supabase 미설정 > 진행 중 > 실패 > 성공/기타 진행 메시지 > 기본값(로컬 저장)
 */
export function getSyncStatusLabel(state: SyncStatusLabelInput): string {
  if (!state.isSupabaseEnabled) {
    return '로컬 저장'
  }

  if (state.isSyncing) {
    return '클라우드 동기화 중'
  }

  if (state.syncError) {
    return state.syncError
  }

  if (state.syncMessage) {
    return state.syncMessage
  }

  return '로컬 저장'
}

export type SyncStatusVariant = 'idle' | 'syncing' | 'success' | 'error'

/** 배지 색상 등 표시 스타일을 결정하기 위한 상태 분류 */
export function getSyncStatusVariant(state: SyncStatusLabelInput): SyncStatusVariant {
  if (!state.isSupabaseEnabled) {
    return 'idle'
  }

  if (state.isSyncing) {
    return 'syncing'
  }

  if (state.syncError) {
    return 'error'
  }

  if (state.syncMessage) {
    return 'success'
  }

  return 'idle'
}
