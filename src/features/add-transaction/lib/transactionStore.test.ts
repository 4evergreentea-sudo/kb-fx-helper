import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ExchangeCalculatorInput,
  ExchangeCalculatorResult,
} from '../../calculate-exchange'

const STORAGE_KEY = 'kb-fx-helper:transactions'
const PENDING_SYNC_STORAGE_KEY = 'kb-fx-helper:pending-sync'

const isSupabaseConfiguredMock = vi.fn(() => false)
vi.mock('../../../shared/config', () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}))

const ensureAnonymousSessionMock = vi.fn()
vi.mock('./supabaseAuth', () => ({
  ensureAnonymousSession: ensureAnonymousSessionMock,
}))

const insertTransactionMock = vi.fn()
const removeRemoteTransactionMock = vi.fn()
const fetchAllTransactionsMock = vi.fn()
vi.mock('./supabaseTransactionRepository', () => ({
  insertTransaction: insertTransactionMock,
  removeRemoteTransaction: removeRemoteTransactionMock,
  fetchAllTransactions: fetchAllTransactionsMock,
}))

/** node 환경(jsdom 미사용)에서 localStorage를 대체하는 최소 메모리 구현 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

/** addTransaction/removeTransaction이 내부적으로 시작한 비동기 동기화 처리가 끝날 때까지 기다린다 */
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function readPendingSyncState(): { pendingAddIds: string[]; pendingDeleteIds: string[] } {
  const raw = localStorage.getItem(PENDING_SYNC_STORAGE_KEY)
  return raw ? JSON.parse(raw) : { pendingAddIds: [], pendingDeleteIds: [] }
}

const validInput: ExchangeCalculatorInput = {
  currencyCode: 'USD',
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  transactionType: 'buy',
  amount: 500,
}

const validResult: ExchangeCalculatorResult = {
  appliedRate: 1545.39,
  krwAmount: 772695,
  validation: { valid: true },
}

const invalidResult: ExchangeCalculatorResult = {
  appliedRate: null,
  krwAmount: null,
  validation: { valid: false, message: '숫자를 올바르게 입력해주세요.' },
}

describe('transactionStore', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    })

    isSupabaseConfiguredMock.mockReset().mockReturnValue(false)
    ensureAnonymousSessionMock.mockReset().mockResolvedValue(null)
    insertTransactionMock.mockReset().mockResolvedValue({ success: true })
    removeRemoteTransactionMock.mockReset().mockResolvedValue({ success: true })
    fetchAllTransactionsMock.mockReset().mockResolvedValue({ success: true, transactions: [] })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  describe('localStorage 기본 동작 (회귀)', () => {
    it('계산이 유효한 경우 거래를 목록 맨 앞에 저장한다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addTransaction(validInput, validResult)

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(1)
      expect(getSnapshot()[0]).toMatchObject({
        currencyCode: 'USD',
        appliedRate: 1545.39,
        krwAmount: 772695,
      })
    })

    it('계산이 유효하지 않으면 저장하지 않고 실패를 반환한다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addTransaction(validInput, invalidResult)

      expect(outcome.success).toBe(false)
      expect(getSnapshot()).toHaveLength(0)
    })

    it('localStorage 저장이 실패하면 메모리 상태를 바꾸지 않고 실패 메시지를 반환한다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          ...createMemoryStorage(),
          setItem: () => {
            throw new Error('QuotaExceededError')
          },
        },
        configurable: true,
      })

      const outcome = addTransaction(validInput, validResult)

      expect(outcome).toEqual({
        success: false,
        message: '거래기록을 저장하지 못했습니다.',
      })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('거래를 삭제하면 목록에서 제거되고 저장된다', async () => {
      const { addTransaction, removeTransaction, getSnapshot } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      const [transaction] = getSnapshot()

      const outcome = removeTransaction(transaction.id)

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('구독자는 추가/삭제 시 알림을 받는다', async () => {
      const { addTransaction, removeTransaction, subscribe, getSnapshot } =
        await import('./transactionStore')

      const listener = vi.fn()
      subscribe(listener)

      addTransaction(validInput, validResult)
      expect(listener).toHaveBeenCalledTimes(1)

      const [transaction] = getSnapshot()
      removeTransaction(transaction.id)
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('손상된 localStorage 데이터는 무시하고 빈 배열로 시작한다', async () => {
      localStorage.setItem(STORAGE_KEY, '{broken-json')

      const { getSnapshot } = await import('./transactionStore')

      expect(getSnapshot()).toEqual([])
    })
  })

  describe('Supabase 미설정 시 localStorage fallback', () => {
    it('isSupabaseConfigured가 false면 추가/삭제 시 원격 API를 호출하지 않는다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(false)

      const { addTransaction, getSnapshot, removeTransaction } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      removeTransaction(transaction.id)
      await flushAsync()

      expect(ensureAnonymousSessionMock).not.toHaveBeenCalled()
      expect(insertTransactionMock).not.toHaveBeenCalled()
      expect(removeRemoteTransactionMock).not.toHaveBeenCalled()
      expect(readPendingSyncState()).toEqual({ pendingAddIds: [], pendingDeleteIds: [] })
    })

    it('syncNow는 isSupabaseConfigured가 false면 아무 것도 하지 않는다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(false)

      const { syncNow } = await import('./transactionStore')

      await syncNow()

      expect(ensureAnonymousSessionMock).not.toHaveBeenCalled()
      expect(fetchAllTransactionsMock).not.toHaveBeenCalled()
    })
  })

  describe('클라우드 동기화', () => {
    beforeEach(() => {
      isSupabaseConfiguredMock.mockReturnValue(true)
      ensureAnonymousSessionMock.mockResolvedValue('user-1')
    })

    it('추가 시 원격 저장에 실패하면 pending add 목록에 기록하고 로컬 상태는 유지된다', async () => {
      insertTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addTransaction(validInput, validResult)
      await flushAsync()

      expect(outcome).toEqual({ success: true })
      const [transaction] = getSnapshot()
      expect(readPendingSyncState().pendingAddIds).toContain(transaction.id)
    })

    it('삭제 시 원격 삭제에 실패하면 tombstone(pending delete) 목록에 기록하고 로컬 상태는 유지된다', async () => {
      insertTransactionMock.mockResolvedValue({ success: true })
      removeRemoteTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addTransaction, getSnapshot, removeTransaction } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      const outcome = removeTransaction(transaction.id)
      await flushAsync()

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(0)
      expect(readPendingSyncState().pendingDeleteIds).toContain(transaction.id)
    })

    it('재시도(syncNow)에 성공하면 pending add 상태가 제거된다', async () => {
      insertTransactionMock.mockResolvedValueOnce({ success: false, message: '실패' })

      const { addTransaction, getSnapshot, syncNow } = await import('./transactionStore')

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      expect(readPendingSyncState().pendingAddIds).toContain(transaction.id)

      insertTransactionMock.mockResolvedValue({ success: true })
      fetchAllTransactionsMock.mockResolvedValue({ success: true, transactions: [] })

      await syncNow()

      expect(readPendingSyncState().pendingAddIds).not.toContain(transaction.id)
    })

    it('재시도(syncNow)에 성공하면 pending delete 상태가 제거된다', async () => {
      insertTransactionMock.mockResolvedValue({ success: true })
      removeRemoteTransactionMock.mockResolvedValueOnce({ success: false, message: '실패' })

      const { addTransaction, getSnapshot, removeTransaction, syncNow } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      removeTransaction(transaction.id)
      await flushAsync()

      expect(readPendingSyncState().pendingDeleteIds).toContain(transaction.id)

      removeRemoteTransactionMock.mockResolvedValue({ success: true })
      fetchAllTransactionsMock.mockResolvedValue({ success: true, transactions: [] })

      await syncNow()

      expect(readPendingSyncState().pendingDeleteIds).not.toContain(transaction.id)
    })

    it('원격 fetch 결과에 tombstone id가 남아있어도 병합 결과에서 부활하지 않는다', async () => {
      insertTransactionMock.mockResolvedValue({ success: true })
      removeRemoteTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addTransaction, getSnapshot, removeTransaction, syncNow } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      removeTransaction(transaction.id)
      await flushAsync()
      expect(getSnapshot()).toHaveLength(0)

      // 원격 삭제가 실제로는 아직 반영되지 않아 fetch에는 여전히 해당 항목이 남아있다고 가정한다.
      fetchAllTransactionsMock.mockResolvedValue({ success: true, transactions: [transaction] })

      await syncNow()

      expect(getSnapshot().some((item) => item.id === transaction.id)).toBe(false)
    })

    it('pending add 상태인 거래를 삭제하면 추가 재시도가 취소되고, 원격 삭제 실패 시 tombstone만 남는다', async () => {
      insertTransactionMock.mockResolvedValue({ success: false, message: '실패' })
      removeRemoteTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addTransaction, getSnapshot, removeTransaction } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      expect(readPendingSyncState().pendingAddIds).toContain(transaction.id)

      removeTransaction(transaction.id)
      await flushAsync()

      const pending = readPendingSyncState()
      expect(pending.pendingAddIds).not.toContain(transaction.id)
      expect(pending.pendingDeleteIds).toContain(transaction.id)
    })

    it('pending add 상태인 거래를 삭제하고 원격 삭제(no-op)에 성공하면 어떤 pending 목록에도 남지 않는다', async () => {
      insertTransactionMock.mockResolvedValue({ success: false, message: '실패' })
      removeRemoteTransactionMock.mockResolvedValue({ success: true })

      const { addTransaction, getSnapshot, removeTransaction } = await import(
        './transactionStore'
      )

      addTransaction(validInput, validResult)
      await flushAsync()
      const [transaction] = getSnapshot()

      removeTransaction(transaction.id)
      await flushAsync()

      const pending = readPendingSyncState()
      expect(pending.pendingAddIds).not.toContain(transaction.id)
      expect(pending.pendingDeleteIds).not.toContain(transaction.id)
    })

    it('원격 fetch 자체가 실패하면 로컬 데이터는 그대로 유지된다', async () => {
      const { addTransaction, getSnapshot, syncNow } = await import('./transactionStore')

      addTransaction(validInput, validResult)
      await flushAsync()
      expect(getSnapshot()).toHaveLength(1)

      fetchAllTransactionsMock.mockResolvedValue({ success: false, transactions: [] })

      await syncNow()

      expect(getSnapshot()).toHaveLength(1)
    })
  })
})
