import { readJSON, writeJSON } from '../../../shared/lib'

const STORAGE_KEY = 'kb-fx-helper:pending-sync'

interface PendingSyncState {
  /** 아직 원격에 반영되지 않은(추가 실패) 거래 id 목록 */
  pendingAddIds: string[]
  /** 원격 삭제에 실패해, 다음 fetch 병합 시 부활하지 않도록 제외해야 하는 id 목록(tombstone) */
  pendingDeleteIds: string[]
}

const EMPTY_STATE: PendingSyncState = { pendingAddIds: [], pendingDeleteIds: [] }

function isPendingSyncState(value: unknown): value is PendingSyncState {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    Array.isArray(candidate.pendingAddIds) &&
    Array.isArray(candidate.pendingDeleteIds) &&
    candidate.pendingAddIds.every((id) => typeof id === 'string') &&
    candidate.pendingDeleteIds.every((id) => typeof id === 'string')
  )
}

let state: PendingSyncState | null = null

function ensureLoaded(): PendingSyncState {
  if (state === null) {
    const raw = readJSON<unknown>(STORAGE_KEY, EMPTY_STATE)
    state = isPendingSyncState(raw) ? raw : EMPTY_STATE
  }

  return state
}

function persist(next: PendingSyncState): void {
  state = next
  writeJSON(STORAGE_KEY, next)
}

export function getPendingAddIds(): string[] {
  return [...ensureLoaded().pendingAddIds]
}

export function getPendingDeleteIds(): string[] {
  return [...ensureLoaded().pendingDeleteIds]
}

/**
 * id를 추가 대기 목록에 넣는다.
 * 같은 id가 삭제 대기(tombstone) 목록에 있었다면 함께 제거해,
 * 하나의 id가 pendingAdd/pendingDelete에 동시에 남지 않도록 정규화한다.
 */
export function addPendingAdd(id: string): void {
  const current = ensureLoaded()
  const nextDeleteIds = current.pendingDeleteIds.filter((existing) => existing !== id)
  const alreadyPending = current.pendingAddIds.includes(id)

  if (alreadyPending && nextDeleteIds.length === current.pendingDeleteIds.length) {
    return
  }

  persist({
    pendingAddIds: alreadyPending ? current.pendingAddIds : [...current.pendingAddIds, id],
    pendingDeleteIds: nextDeleteIds,
  })
}

export function removePendingAdd(id: string): void {
  const current = ensureLoaded()

  if (!current.pendingAddIds.includes(id)) {
    return
  }

  persist({
    ...current,
    pendingAddIds: current.pendingAddIds.filter((existing) => existing !== id),
  })
}

/**
 * id를 삭제 대기(tombstone) 목록에 넣는다.
 * 같은 id가 추가 대기 목록에 있었다면 함께 제거해 정규화한다
 * (아직 원격에 없을 수도 있는 항목을 삭제 대상으로 바꾸는 것 = 더는 추가를 재시도하지 않음).
 */
export function addPendingDelete(id: string): void {
  const current = ensureLoaded()
  const nextAddIds = current.pendingAddIds.filter((existing) => existing !== id)
  const alreadyTombstoned = current.pendingDeleteIds.includes(id)

  if (alreadyTombstoned && nextAddIds.length === current.pendingAddIds.length) {
    return
  }

  persist({
    pendingAddIds: nextAddIds,
    pendingDeleteIds: alreadyTombstoned
      ? current.pendingDeleteIds
      : [...current.pendingDeleteIds, id],
  })
}

export function removePendingDelete(id: string): void {
  const current = ensureLoaded()

  if (!current.pendingDeleteIds.includes(id)) {
    return
  }

  persist({
    ...current,
    pendingDeleteIds: current.pendingDeleteIds.filter((existing) => existing !== id),
  })
}

/** 테스트 전용: 메모리 캐시를 비워 다음 호출 시 localStorage를 다시 읽게 한다 */
export function resetPendingSyncCache(): void {
  state = null
}
