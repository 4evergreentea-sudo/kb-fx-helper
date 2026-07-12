import { isSupabaseConfigured } from '../../../shared/config'
import type { SyncState } from '../model/types'

const listeners = new Set<() => void>()

function createInitialState(): SyncState {
  return {
    isSupabaseEnabled: isSupabaseConfigured(),
    isSyncing: false,
    phase: 'idle',
    syncMessage: null,
    syncError: null,
  }
}

let state: SyncState = createInitialState()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** useSyncExternalStore가 구독할 콜백을 등록한다 */
export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 현재 동기화 상태 스냅샷을 반환한다. 값이 바뀌지 않으면 동일한 참조를 반환한다 */
export function getSyncStatusSnapshot(): SyncState {
  return state
}

/** 동기화 상태를 부분적으로 갱신하고 구독자에게 알린다 */
export function setSyncStatus(partial: Partial<SyncState>): void {
  state = { ...state, ...partial }
  notify()
}

/** 테스트 전용: 상태를 초기값으로 되돌린다 */
export function resetSyncStatus(): void {
  state = createInitialState()
  notify()
}
