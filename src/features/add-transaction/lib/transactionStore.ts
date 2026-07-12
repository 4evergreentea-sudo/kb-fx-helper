import { createTransaction, parseTransactions } from '../../../entities/transaction'
import type { Transaction } from '../../../entities/transaction'
import { isSupabaseConfigured } from '../../../shared/config'
import { readJSON, writeJSON } from '../../../shared/lib'
import type {
  ExchangeCalculatorInput,
  ExchangeCalculatorResult,
} from '../../calculate-exchange'
import type { TransactionOperationResult } from '../model/types'
import * as pendingSyncStore from './pendingSyncStore'
import { ensureAnonymousSession } from './supabaseAuth'
import {
  fetchAllTransactions,
  insertTransaction,
  removeRemoteTransaction,
} from './supabaseTransactionRepository'
import { setSyncStatus } from './syncStatusStore'

const STORAGE_KEY = 'kb-fx-helper:transactions'

const SYNC_IN_PROGRESS_MESSAGE = '클라우드 동기화 중'
const SYNC_SUCCESS_MESSAGE = '클라우드 동기화 완료'
const SYNC_ERROR_MESSAGE = '클라우드 동기화 실패 — 로컬에는 저장됨'

/**
 * 거래 목록의 단일 소스(source of truth). localStorage에 직접 접근하는 유일한 지점이며,
 * 이 모듈을 거치지 않고는 거래 데이터를 읽거나 바꿀 수 없다.
 * Supabase는 이 store가 성공적으로 localStorage에 반영한 뒤 best-effort로 미러링하는
 * 보조 저장소이며, 실패해도 로컬 상태(=화면에 보이는 상태)는 항상 유지된다.
 */
let transactions: Transaction[] | null = null
const listeners = new Set<() => void>()

let initialSyncTriggered = false
let syncInFlight: Promise<void> | null = null

function ensureLoaded(): Transaction[] {
  if (transactions === null) {
    transactions = parseTransactions(readJSON<unknown>(STORAGE_KEY, []))
  }

  return transactions
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** useSyncExternalStore가 구독할 콜백을 등록한다 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 현재 거래 목록 스냅샷을 반환한다. 값이 바뀌지 않으면 동일한 배열 참조를 반환한다 */
export function getSnapshot(): Transaction[] {
  return ensureLoaded()
}

/**
 * 계산이 유효한 경우에만 거래를 저장한다.
 * localStorage 저장에 실패하면 메모리 상태도 변경하지 않아 화면과 저장소 상태가 어긋나지 않는다.
 * localStorage 저장에 성공하면(=UI에는 이미 반영됨) Supabase 추가를 best-effort로 시도하고,
 * 실패하면 pending add 목록에 기록해 다음 동기화에서 재시도한다.
 */
export function addTransaction(
  input: ExchangeCalculatorInput,
  result: ExchangeCalculatorResult,
): TransactionOperationResult {
  if (!result.validation.valid || result.appliedRate === null || result.krwAmount === null) {
    return {
      success: false,
      message: '계산이 유효하지 않아 거래를 저장할 수 없습니다.',
    }
  }

  const current = ensureLoaded()
  const transaction = createTransaction({
    currencyCode: input.currencyCode,
    transactionType: input.transactionType,
    amount: input.amount,
    baseRate: input.baseRate,
    spreadRate: input.spreadRate,
    preferentialRate: input.preferentialRate,
    appliedRate: result.appliedRate,
    krwAmount: result.krwAmount,
  })
  const next = [transaction, ...current]

  if (!writeJSON(STORAGE_KEY, next)) {
    return { success: false, message: '거래기록을 저장하지 못했습니다.' }
  }

  transactions = next
  notify()

  void syncTransactionAddition(transaction)

  return { success: true }
}

/**
 * id로 거래를 삭제한다. 저장에 실패하면 메모리 상태를 변경하지 않는다.
 * 아직 원격에 반영되지 않은(pending add) 거래라면 추가 재시도를 즉시 취소하고,
 * 원격에 이미 있을 가능성에 대비해 삭제를 best-effort로 시도한다. 실패하면 tombstone으로 기록해
 * 다음 원격 조회 병합 시 되살아나지 않도록 한다.
 */
export function removeTransaction(id: string): TransactionOperationResult {
  const current = ensureLoaded()
  const next = current.filter((transaction) => transaction.id !== id)

  if (next.length === current.length) {
    return { success: true }
  }

  if (!writeJSON(STORAGE_KEY, next)) {
    return { success: false, message: '거래기록을 삭제하지 못했습니다.' }
  }

  transactions = next
  notify()

  pendingSyncStore.removePendingAdd(id)
  void syncTransactionRemoval(id)

  return { success: true }
}

function hasPendingSync(): boolean {
  return (
    pendingSyncStore.getPendingAddIds().length > 0 ||
    pendingSyncStore.getPendingDeleteIds().length > 0
  )
}

function reportSyncOutcome(): void {
  setSyncStatus(
    hasPendingSync()
      ? { isSyncing: false, phase: 'error', syncMessage: null, syncError: SYNC_ERROR_MESSAGE }
      : { isSyncing: false, phase: 'synced', syncMessage: SYNC_SUCCESS_MESSAGE, syncError: null },
  )
}

async function syncTransactionAddition(transaction: Transaction): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const userId = await ensureAnonymousSession()

  if (!userId) {
    pendingSyncStore.addPendingAdd(transaction.id)
    setSyncStatus({ isSyncing: false, phase: 'error', syncMessage: null, syncError: SYNC_ERROR_MESSAGE })
    return
  }

  const outcome = await insertTransaction(transaction, userId)

  if (outcome.success) {
    pendingSyncStore.removePendingAdd(transaction.id)
  } else {
    pendingSyncStore.addPendingAdd(transaction.id)
  }

  reportSyncOutcome()
}

async function syncTransactionRemoval(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const userId = await ensureAnonymousSession()

  if (!userId) {
    pendingSyncStore.addPendingDelete(id)
    setSyncStatus({ isSyncing: false, phase: 'error', syncMessage: null, syncError: SYNC_ERROR_MESSAGE })
    return
  }

  const outcome = await removeRemoteTransaction(id)

  if (outcome.success) {
    pendingSyncStore.removePendingDelete(id)
  } else {
    pendingSyncStore.addPendingDelete(id)
  }

  reportSyncOutcome()
}

/** 원격 목록과 로컬 목록을 id 기준으로 병합한다. 충돌 시 로컬 값을 우선하고, createdAt 내림차순으로 정렬한다 */
function mergeTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
  const merged = new Map<string, Transaction>()

  for (const transaction of remote) {
    merged.set(transaction.id, transaction)
  }

  for (const transaction of local) {
    merged.set(transaction.id, transaction)
  }

  return Array.from(merged.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/**
 * pending add/delete를 우선순위(삭제 먼저)대로 재시도하고, 원격 목록을 조회해 로컬과 병합한다.
 * 동시에 여러 번 호출돼도 진행 중인 동기화가 있으면 그 promise를 재사용한다.
 */
export function syncNow(): Promise<void> {
  if (!syncInFlight) {
    syncInFlight = runSync().finally(() => {
      syncInFlight = null
    })
  }

  return syncInFlight
}

/** 사용자가 누르는 수동 재동기화 버튼, 앱 시작, online 복귀 시 모두 이 함수를 호출한다 */
export function retrySync(): void {
  void syncNow()
}

/** 마운트 시 1회만 자동 동기화를 트리거한다(여러 컴포넌트가 훅을 사용해도 중복 실행되지 않음) */
export function initSync(): void {
  if (initialSyncTriggered) {
    return
  }

  initialSyncTriggered = true
  void syncNow()
}

async function runSync(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  setSyncStatus({ isSyncing: true, phase: 'syncing', syncMessage: SYNC_IN_PROGRESS_MESSAGE, syncError: null })

  const userId = await ensureAnonymousSession()

  if (!userId) {
    setSyncStatus({ isSyncing: false, phase: 'error', syncMessage: null, syncError: SYNC_ERROR_MESSAGE })
    return
  }

  // 1) 삭제가 추가보다 우선한다: 삭제 대기(tombstone)를 먼저 재시도한다.
  for (const id of pendingSyncStore.getPendingDeleteIds()) {
    const outcome = await removeRemoteTransaction(id)

    if (outcome.success) {
      pendingSyncStore.removePendingDelete(id)
    }
  }

  // 2) 추가 재시도. 여전히 삭제 대기 중인 id는 재시도 대상에서 제외한다.
  const remainingDeleteIds = new Set(pendingSyncStore.getPendingDeleteIds())
  const localSnapshot = ensureLoaded()

  for (const id of pendingSyncStore.getPendingAddIds()) {
    if (remainingDeleteIds.has(id)) {
      continue
    }

    const transaction = localSnapshot.find((item) => item.id === id)

    if (!transaction) {
      pendingSyncStore.removePendingAdd(id)
      continue
    }

    const outcome = await insertTransaction(transaction, userId)

    if (outcome.success) {
      pendingSyncStore.removePendingAdd(id)
    }
  }

  // 3) 원격 목록 조회 후 tombstone id를 제외하고 로컬과 병합한다.
  const fetchResult = await fetchAllTransactions()
  const tombstoneIds = new Set(pendingSyncStore.getPendingDeleteIds())
  const filteredRemote = fetchResult.transactions.filter((item) => !tombstoneIds.has(item.id))
  const merged = mergeTransactions(ensureLoaded(), filteredRemote)

  transactions = merged
  writeJSON(STORAGE_KEY, merged)
  notify()

  if (!fetchResult.success) {
    setSyncStatus({ isSyncing: false, phase: 'error', syncMessage: null, syncError: SYNC_ERROR_MESSAGE })
    return
  }

  reportSyncOutcome()
}
