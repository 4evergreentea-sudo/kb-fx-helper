import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import type { Transaction } from '../../../entities/transaction'
import type {
  ExchangeCalculatorInput,
  ExchangeCalculatorResult,
} from '../../calculate-exchange'
import type { SyncState, TransactionOperationResult } from '../model/types'
import { getSyncStatusSnapshot, subscribeSyncStatus } from './syncStatusStore'
import {
  addTransaction,
  getSnapshot,
  initSync,
  removeTransaction,
  retrySync,
  subscribe,
} from './transactionStore'

export interface UseTransactionHistoryResult extends SyncState {
  transactions: Transaction[]
  addTransaction: (
    input: ExchangeCalculatorInput,
    result: ExchangeCalculatorResult,
  ) => TransactionOperationResult
  removeTransaction: (id: string) => TransactionOperationResult
  /** 사용자가 누르는 수동 재동기화 버튼에서 호출한다 */
  retrySync: () => void
}

/**
 * 거래 목록/클라우드 동기화 상태를 구독하고 저장/삭제 기능을 제공하는 유일한 공개 API.
 * 여러 위젯에서 이 훅을 각자 호출해도 동일한 store를 구독하므로 항상 동기화된 상태를 본다.
 * 마운트 시 1회 자동 동기화를 트리거하고, 브라우저가 오프라인→온라인으로 전환되면 재시도한다.
 */
export function useTransactionHistory(): UseTransactionHistoryResult {
  const transactions = useSyncExternalStore(subscribe, getSnapshot)
  const syncState = useSyncExternalStore(subscribeSyncStatus, getSyncStatusSnapshot)

  useEffect(() => {
    initSync()
  }, [])

  useEffect(() => {
    function handleOnline(): void {
      retrySync()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return { transactions, addTransaction, removeTransaction, retrySync, ...syncState }
}
