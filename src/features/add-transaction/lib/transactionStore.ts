import {
  createConsultationRecord,
  createExchangeTransaction,
  createRemittanceTransaction,
  parseTransactions,
  validateConsultationAmount,
  validateConsultationMemo,
  validateCustomerName,
  validateRemittanceAmounts,
} from '../../../entities/transaction'
import type { Transaction } from '../../../entities/transaction'
import { isSupabaseConfigured } from '../../../shared/config'
import { readJSON, writeJSON } from '../../../shared/lib'
import type {
  AddConsultationInput,
  AddExchangeTransactionInput,
  AddRemittanceTransactionInput,
  TransactionOperationResult,
} from '../model/types'
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

/** 새 거래(환전/해외송금/상담 공통)를 목록 맨 앞에 추가하고 localStorage에 반영한다 */
function persistNewTransaction(transaction: Transaction): TransactionOperationResult {
  const current = ensureLoaded()
  const next = [transaction, ...current]

  if (!writeJSON(STORAGE_KEY, next)) {
    return { success: false, message: '거래기록을 저장하지 못했습니다.' }
  }

  transactions = next
  notify()

  return { success: true }
}

/**
 * 고객명이 입력된 환전 거래를 저장한다.
 * 고객명이 비어 있거나 공백뿐이면 저장하지 않고 실패 메시지를 반환한다.
 * customerName은 trim된 값으로, memo는 없으면 빈 문자열로 정규화되어 저장된다.
 * localStorage 저장에 성공하면(=UI에는 이미 반영됨) Supabase 추가를 best-effort로 시도하고,
 * 실패하면 pending add 목록에 기록해 다음 동기화에서 재시도한다.
 */
export function addTransaction(input: AddExchangeTransactionInput): TransactionOperationResult {
  const customerName = input.customerName.trim()
  const nameCheck = validateCustomerName(customerName)

  if (!nameCheck.valid) {
    return { success: false, message: nameCheck.message }
  }

  const transaction = createExchangeTransaction({
    recordType: 'exchange',
    customerName,
    currencyCode: input.currencyCode,
    transactionType: input.transactionType,
    amount: input.amount,
    baseRate: input.baseRate,
    spreadRate: input.spreadRate,
    preferentialRate: input.preferentialRate,
    appliedRate: input.appliedRate,
    krwAmount: input.krwAmount,
    memo: input.memo ?? '',
  })

  const outcome = persistNewTransaction(transaction)

  if (!outcome.success) {
    return outcome
  }

  void syncTransactionAddition(transaction)

  return outcome
}

/**
 * 고객명이 입력된 해외송금 거래를 저장한다.
 * 고객명이 비어 있거나 공백뿐이면, 또는 계산된 금액 필드가 유효 범위를 벗어나면
 * 저장하지 않고 실패 메시지를 반환한다.
 * customerName은 trim된 값으로, memo는 없으면 빈 문자열로 정규화되어 저장된다.
 * 계산 자체(features/calculate-remittance)에는 의존하지 않으며, 이미 계산된 결과를
 * Widget이 AddRemittanceTransactionInput으로 조립해 전달하는 것을 전제로 한다.
 * localStorage 저장에 성공하면 addTransaction과 동일하게 Supabase 추가를 best-effort로 시도한다.
 */
export function addRemittanceTransaction(
  input: AddRemittanceTransactionInput,
): TransactionOperationResult {
  const customerName = input.customerName.trim()
  const nameCheck = validateCustomerName(customerName)

  if (!nameCheck.valid) {
    return { success: false, message: nameCheck.message }
  }

  const amountsCheck = validateRemittanceAmounts({
    amount: input.amount,
    appliedRate: input.appliedRate,
    principalKRW: input.principalKRW,
    remittanceFee: input.remittanceFee,
    cableFee: input.cableFee,
    totalWithdrawalKRW: input.totalWithdrawalKRW,
  })

  if (!amountsCheck.valid) {
    return { success: false, message: amountsCheck.message }
  }

  const transaction = createRemittanceTransaction({
    recordType: 'remittance',
    customerName,
    currencyCode: input.currencyCode,
    amount: input.amount,
    baseRate: input.baseRate,
    spreadRate: input.spreadRate,
    preferentialRate: input.preferentialRate,
    appliedRate: input.appliedRate,
    principalKRW: input.principalKRW,
    remittanceFee: input.remittanceFee,
    cableFee: input.cableFee,
    totalWithdrawalKRW: input.totalWithdrawalKRW,
    memo: input.memo ?? '',
  })

  const outcome = persistNewTransaction(transaction)

  if (!outcome.success) {
    return outcome
  }

  void syncTransactionAddition(transaction)

  return outcome
}

/**
 * 고객명·외화금액·메모가 입력된 상담 기록을 저장한다.
 * 고객명 또는 메모가 비어 있거나 공백뿐이거나, 외화금액이 0보다 크지 않으면
 * 저장하지 않고 실패 메시지를 반환한다.
 * localStorage 저장에 성공하면 addTransaction과 동일하게 Supabase 추가를 best-effort로 시도한다.
 */
export function addConsultationRecord(input: AddConsultationInput): TransactionOperationResult {
  const customerName = input.customerName.trim()
  const nameCheck = validateCustomerName(customerName)

  if (!nameCheck.valid) {
    return { success: false, message: nameCheck.message }
  }

  const amountCheck = validateConsultationAmount(input.amount)

  if (!amountCheck.valid) {
    return { success: false, message: amountCheck.message }
  }

  const memo = input.memo.trim()
  const memoCheck = validateConsultationMemo(memo)

  if (!memoCheck.valid) {
    return { success: false, message: memoCheck.message }
  }

  const record = createConsultationRecord({
    recordType: 'consultation',
    customerName,
    currencyCode: input.currencyCode,
    amount: input.amount,
    memo,
  })

  const outcome = persistNewTransaction(record)

  if (!outcome.success) {
    return outcome
  }

  void syncTransactionAddition(record)

  return outcome
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

/**
 * customerName/memo/recordType 중 값이 있는 로컬 값을 원격의 빈 값으로 덮어쓰지 않기 위한
 * 안전장치. 마이그레이션 전 원격 row(customer_name/memo가 백필된 빈 문자열이거나 record_type이
 * null인 레거시 행)와 병합할 때, 로컬에 이미 있던 실제 값이 원격의 빈 값으로 지워지지 않도록
 * 로컬 값을 우선한다.
 */
function preferLocalCompatFields(local: Transaction, remote: Transaction): Transaction {
  return {
    ...remote,
    customerName: local.customerName.trim().length > 0 ? local.customerName : remote.customerName,
    memo: local.memo.trim().length > 0 ? local.memo : remote.memo,
    recordType: local.recordType,
  } as Transaction
}

/**
 * 원격 목록과 로컬 목록을 id 기준으로 병합한다.
 * 원격 값을 기본으로 사용하되(§ 8.1 동기화 모델), 같은 id가 로컬에도 있으면
 * preferLocalCompatFields()로 customerName/memo/recordType은 로컬의 실제 값을 지킨다.
 * createdAt 내림차순으로 정렬한다.
 */
function mergeTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
  const localById = new Map(local.map((transaction) => [transaction.id, transaction] as const))
  const merged = new Map<string, Transaction>()

  for (const transaction of remote) {
    const localMatch = localById.get(transaction.id)
    merged.set(transaction.id, localMatch ? preferLocalCompatFields(localMatch, transaction) : transaction)
  }

  for (const transaction of local) {
    if (!merged.has(transaction.id)) {
      merged.set(transaction.id, transaction)
    }
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
