import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AddConsultationInput,
  AddExchangeTransactionInput,
  AddRemittanceTransactionInput,
} from '../model/types'

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

const validExchangeInput: AddExchangeTransactionInput = {
  customerName: '테스트고객 A',
  currencyCode: 'USD',
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  transactionType: 'buy',
  amount: 500,
  appliedRate: 1545.39,
  krwAmount: 772695,
}

const validConsultationInput: AddConsultationInput = {
  customerName: '테스트고객 B',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문, 다음 주 재방문 예정',
}

const validRemittanceInput: AddRemittanceTransactionInput = {
  customerName: '테스트고객 C',
  currencyCode: 'USD',
  amount: 1000,
  baseRate: 1400,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1404.9,
  principalKRW: 1404900,
  remittanceFee: 5000,
  cableFee: 8000,
  totalWithdrawalKRW: 1417900,
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

  describe('addTransaction(환전) 기본 동작', () => {
    it('고객명이 있으면 거래를 목록 맨 앞에 저장한다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addTransaction(validExchangeInput)

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(1)
      expect(getSnapshot()[0]).toMatchObject({
        recordType: 'exchange',
        customerName: '테스트고객 A',
        currencyCode: 'USD',
        appliedRate: 1545.39,
        krwAmount: 772695,
        memo: '',
      })
    })

    it('고객명이 비어 있으면 저장하지 않고 한국어 안내 메시지를 반환한다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addTransaction({ ...validExchangeInput, customerName: '' })

      expect(outcome).toEqual({ success: false, message: '고객명을 입력해주세요.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('고객명이 공백뿐이면 저장하지 않는다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addTransaction({ ...validExchangeInput, customerName: '   ' })

      expect(outcome).toEqual({ success: false, message: '고객명을 입력해주세요.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('고객명 앞뒤 공백은 trim되어 저장된다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      addTransaction({ ...validExchangeInput, customerName: '  테스트고객 A  ' })

      expect(getSnapshot()[0].customerName).toBe('테스트고객 A')
    })

    it('memo를 생략하면 빈 문자열로 정규화되어 저장된다', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      addTransaction(validExchangeInput)

      expect(getSnapshot()[0].memo).toBe('')
    })

    it('memo를 입력하면 그대로 저장된다(선택 항목)', async () => {
      const { addTransaction, getSnapshot } = await import('./transactionStore')

      addTransaction({ ...validExchangeInput, memo: '창구 방문 상담 병행' })

      expect(getSnapshot()[0].memo).toBe('창구 방문 상담 병행')
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

      const outcome = addTransaction(validExchangeInput)

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

      addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
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

    it('레거시(recordType 없는) localStorage 데이터도 깨지지 않고 로드된다(회귀 방지)', async () => {
      const legacy = {
        id: 'legacy-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        currencyCode: 'USD',
        transactionType: 'sell',
        amount: 1000,
        baseRate: 1300,
        spreadRate: 1.5,
        preferentialRate: 50,
        appliedRate: 1298.05,
        krwAmount: 1298050,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([legacy]))

      const { getSnapshot } = await import('./transactionStore')

      expect(getSnapshot()).toEqual([
        { ...legacy, recordType: 'exchange', customerName: '', memo: '' },
      ])
    })
  })

  describe('addRemittanceTransaction(해외송금)', () => {
    it('고객명이 있으면 송금 거래를 저장에 성공한다', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addRemittanceTransaction(validRemittanceInput)

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(1)
      expect(getSnapshot()[0]).toMatchObject({
        recordType: 'remittance',
        customerName: '테스트고객 C',
        currencyCode: 'USD',
        amount: 1000,
        appliedRate: 1404.9,
        principalKRW: 1404900,
        remittanceFee: 5000,
        cableFee: 8000,
        totalWithdrawalKRW: 1417900,
        memo: '',
      })
    })

    it('고객명 앞뒤 공백은 trim되어 저장된다', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      addRemittanceTransaction({ ...validRemittanceInput, customerName: '  테스트고객 C  ' })

      expect(getSnapshot()[0].customerName).toBe('테스트고객 C')
    })

    it('고객명이 비어 있으면 저장하지 않고 한국어 안내 메시지를 반환한다', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addRemittanceTransaction({ ...validRemittanceInput, customerName: '' })

      expect(outcome).toEqual({ success: false, message: '고객명을 입력해주세요.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('고객명이 공백뿐이면 저장을 거부한다', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addRemittanceTransaction({ ...validRemittanceInput, customerName: '   ' })

      expect(outcome).toEqual({ success: false, message: '고객명을 입력해주세요.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('memo를 생략하면 빈 문자열로 정규화되어 저장된다', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      addRemittanceTransaction(validRemittanceInput)

      expect(getSnapshot()[0].memo).toBe('')
    })

    it('memo를 입력하면 그대로 저장된다(선택 항목)', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      addRemittanceTransaction({ ...validRemittanceInput, memo: '유학 자금 송금' })

      expect(getSnapshot()[0].memo).toBe('유학 자금 송금')
    })

    it.each([
      ['외화 송금액이 0이면', { amount: 0 }, '외화 송금액은 0보다 커야 합니다.'],
      ['외화 송금액이 음수이면', { amount: -1 }, '외화 송금액은 0보다 커야 합니다.'],
      ['적용환율이 0이면', { appliedRate: 0 }, '적용환율은 0보다 커야 합니다.'],
      ['송금원금이 음수이면', { principalKRW: -1 }, '송금원금은 0 이상이어야 합니다.'],
      ['송금수수료가 음수이면', { remittanceFee: -1 }, '송금수수료는 0 이상이어야 합니다.'],
      ['전신료가 음수이면', { cableFee: -1 }, '전신료는 0 이상이어야 합니다.'],
      [
        '총 출금액이 음수이면',
        { totalWithdrawalKRW: -1 },
        '총 출금액은 0 이상이어야 합니다.',
      ],
    ])('%s 저장을 거부한다(잘못된 금액)', async (_label, override, message) => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addRemittanceTransaction({ ...validRemittanceInput, ...override })

      expect(outcome).toEqual({ success: false, message })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('localStorage에 정상적으로 저장되고 즉시 복원된다', async () => {
      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      addRemittanceTransaction(validRemittanceInput)

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({ recordType: 'remittance', customerName: '테스트고객 C' })
      expect(getSnapshot()).toHaveLength(1)
    })

    it('새로고침(모듈 재로딩) 후에도 저장된 해외송금 거래가 유지된다', async () => {
      const { addRemittanceTransaction } = await import('./transactionStore')
      addRemittanceTransaction(validRemittanceInput)

      // 새로고침을 흉내내기 위해 모듈 상태를 완전히 초기화하고 localStorage에서 다시 읽는다.
      vi.resetModules()
      const { getSnapshot: getSnapshotAfterReload } = await import('./transactionStore')

      expect(getSnapshotAfterReload()).toHaveLength(1)
      expect(getSnapshotAfterReload()[0]).toMatchObject({
        recordType: 'remittance',
        customerName: '테스트고객 C',
        totalWithdrawalKRW: 1417900,
      })
    })

    it('Supabase가 설정되어 있으면 addTransaction과 동일하게 원격 동기화(insertTransaction)를 호출한다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(true)
      ensureAnonymousSessionMock.mockResolvedValue('user-1')

      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addRemittanceTransaction(validRemittanceInput)
      await flushAsync()

      expect(outcome).toEqual({ success: true })
      expect(ensureAnonymousSessionMock).toHaveBeenCalled()
      expect(insertTransactionMock).toHaveBeenCalledWith(getSnapshot()[0], 'user-1')
      expect(readPendingSyncState()).toEqual({ pendingAddIds: [], pendingDeleteIds: [] })
    })

    it('원격 저장에 실패하면 pending add 목록에 기록하고 로컬 상태는 유지된다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(true)
      ensureAnonymousSessionMock.mockResolvedValue('user-1')
      insertTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addRemittanceTransaction, getSnapshot } = await import('./transactionStore')

      const outcome = addRemittanceTransaction(validRemittanceInput)
      await flushAsync()

      expect(outcome).toEqual({ success: true })
      const [transaction] = getSnapshot()
      expect(readPendingSyncState().pendingAddIds).toContain(transaction.id)
    })

    it('환전/상담 기록과 함께 저장해도 서로 섞이지 않고 recordType으로 구분된다(거래 목록 recordType 분기)', async () => {
      const { addTransaction, addRemittanceTransaction, addConsultationRecord, getSnapshot } =
        await import('./transactionStore')

      addTransaction(validExchangeInput)
      addRemittanceTransaction(validRemittanceInput)
      addConsultationRecord(validConsultationInput)

      const recordTypes = getSnapshot().map((transaction) => transaction.recordType)
      expect(recordTypes.sort()).toEqual(['consultation', 'exchange', 'remittance'])
    })
  })

  describe('addConsultationRecord(상담 기록)', () => {
    it('고객명·메모가 있으면 저장에 성공한다', async () => {
      const { addConsultationRecord, getSnapshot } = await import('./transactionStore')

      const outcome = addConsultationRecord(validConsultationInput)

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(1)
      expect(getSnapshot()[0]).toMatchObject({
        recordType: 'consultation',
        customerName: '테스트고객 B',
        memo: '환전 상담 방문, 다음 주 재방문 예정',
      })
    })

    it('고객명이 없으면 저장하지 않는다', async () => {
      const { addConsultationRecord, getSnapshot } = await import('./transactionStore')

      const outcome = addConsultationRecord({ ...validConsultationInput, customerName: '' })

      expect(outcome).toEqual({ success: false, message: '고객명을 입력해주세요.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('메모가 없으면 저장하지 않는다(상담 기록은 메모 필수)', async () => {
      const { addConsultationRecord, getSnapshot } = await import('./transactionStore')

      const outcome = addConsultationRecord({ ...validConsultationInput, memo: '   ' })

      expect(outcome).toEqual({ success: false, message: '상담 내용을 메모에 입력해주세요.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it.each([
      ['0이면', 0],
      ['음수이면', -1],
    ])('외화금액이 %s 저장하지 않는다', async (_label, amount) => {
      const { addConsultationRecord, getSnapshot } = await import('./transactionStore')

      const outcome = addConsultationRecord({ ...validConsultationInput, amount })

      expect(outcome).toEqual({ success: false, message: '외화금액은 0보다 커야 합니다.' })
      expect(getSnapshot()).toHaveLength(0)
    })

    it('새로고침(모듈 재로딩) 후에도 저장된 상담 기록이 유지된다', async () => {
      const { addConsultationRecord } = await import('./transactionStore')
      addConsultationRecord(validConsultationInput)

      vi.resetModules()
      const { getSnapshot: getSnapshotAfterReload } = await import('./transactionStore')

      expect(getSnapshotAfterReload()).toHaveLength(1)
      expect(getSnapshotAfterReload()[0]).toMatchObject({
        recordType: 'consultation',
        customerName: '테스트고객 B',
        memo: '환전 상담 방문, 다음 주 재방문 예정',
      })
    })

    it('삭제 후 새로고침(모듈 재로딩)해도 상담 기록이 되살아나지 않는다', async () => {
      const { addConsultationRecord, removeTransaction, getSnapshot } = await import(
        './transactionStore'
      )
      addConsultationRecord(validConsultationInput)
      const [saved] = getSnapshot()

      removeTransaction(saved.id)

      vi.resetModules()
      const { getSnapshot: getSnapshotAfterReload } = await import('./transactionStore')

      expect(getSnapshotAfterReload()).toEqual([])
    })

    it('Supabase가 설정되어 있으면 addTransaction과 동일하게 원격 동기화(insertTransaction)를 호출한다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(true)
      ensureAnonymousSessionMock.mockResolvedValue('user-1')

      const { addConsultationRecord, getSnapshot } = await import('./transactionStore')

      addConsultationRecord(validConsultationInput)
      await flushAsync()

      expect(ensureAnonymousSessionMock).toHaveBeenCalled()
      expect(insertTransactionMock).toHaveBeenCalledWith(getSnapshot()[0], 'user-1')
      expect(readPendingSyncState()).toEqual({ pendingAddIds: [], pendingDeleteIds: [] })
    })

    it('원격 저장에 실패하면 pending add 목록에 기록하고 로컬 상태는 유지된다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(true)
      ensureAnonymousSessionMock.mockResolvedValue('user-1')
      insertTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addConsultationRecord, getSnapshot } = await import('./transactionStore')

      addConsultationRecord(validConsultationInput)
      await flushAsync()

      const [record] = getSnapshot()
      expect(readPendingSyncState().pendingAddIds).toContain(record.id)
    })
  })

  describe('Supabase 미설정 시 localStorage fallback', () => {
    it('isSupabaseConfigured가 false면 추가/삭제 시 원격 API를 호출하지 않는다', async () => {
      isSupabaseConfiguredMock.mockReturnValue(false)

      const { addTransaction, getSnapshot, removeTransaction } = await import(
        './transactionStore'
      )

      addTransaction(validExchangeInput)
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

      const outcome = addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
      await flushAsync()
      const [transaction] = getSnapshot()

      const outcome = removeTransaction(transaction.id)
      await flushAsync()

      expect(outcome).toEqual({ success: true })
      expect(getSnapshot()).toHaveLength(0)
      expect(readPendingSyncState().pendingDeleteIds).toContain(transaction.id)
    })

    it('해외송금·상담 기록도 pending add 재시도(syncNow) 대상에 포함된다', async () => {
      insertTransactionMock.mockResolvedValue({ success: false, message: '실패' })

      const { addRemittanceTransaction, addConsultationRecord, getSnapshot, syncNow } =
        await import('./transactionStore')

      addRemittanceTransaction(validRemittanceInput)
      addConsultationRecord(validConsultationInput)
      await flushAsync()

      const [consultation, remittance] = getSnapshot()
      expect(readPendingSyncState().pendingAddIds.sort()).toEqual(
        [remittance.id, consultation.id].sort(),
      )

      insertTransactionMock.mockResolvedValue({ success: true })
      fetchAllTransactionsMock.mockResolvedValue({ success: true, transactions: [] })

      await syncNow()

      expect(readPendingSyncState().pendingAddIds).toEqual([])
      expect(insertTransactionMock).toHaveBeenCalledWith(remittance, 'user-1')
      expect(insertTransactionMock).toHaveBeenCalledWith(consultation, 'user-1')
    })

    it('재시도(syncNow)에 성공하면 pending add 상태가 제거된다', async () => {
      insertTransactionMock.mockResolvedValueOnce({ success: false, message: '실패' })

      const { addTransaction, getSnapshot, syncNow } = await import('./transactionStore')

      addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
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

      addTransaction(validExchangeInput)
      await flushAsync()
      expect(getSnapshot()).toHaveLength(1)

      fetchAllTransactionsMock.mockResolvedValue({ success: false, transactions: [] })

      await syncNow()

      expect(getSnapshot()).toHaveLength(1)
    })

    it(
      '원격 스키마에 customer_name/memo가 없어 빈 값으로 오더라도, ' +
        '같은 id의 로컬 customerName/memo가 있으면 동기화 후에도 유지된다(호환 병합)',
      async () => {
        const { addTransaction, getSnapshot, syncNow } = await import('./transactionStore')

        addTransaction({
          ...validExchangeInput,
          customerName: '테스트고객 A',
          memo: '여행 환전',
        })
        await flushAsync()
        const [localTransaction] = getSnapshot()

        // 현재 Supabase 스키마에는 customer_name/memo 컬럼이 없어
        // fromTransactionRow()가 항상 빈 문자열로 합성한 값을 반환한다고 가정한다.
        const remoteRow = {
          ...localTransaction,
          customerName: '',
          memo: '',
        }
        fetchAllTransactionsMock.mockResolvedValue({ success: true, transactions: [remoteRow] })

        await syncNow()

        const [syncedTransaction] = getSnapshot()
        expect(syncedTransaction.customerName).toBe('테스트고객 A')
        expect(syncedTransaction.memo).toBe('여행 환전')
      },
    )

    it('로컬 customerName/memo가 비어 있으면(예: 마이그레이션된 레거시 기록) 원격 값을 사용한다', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            id: 'legacy-1',
            createdAt: '2025-01-01T00:00:00.000Z',
            recordType: 'exchange',
            customerName: '',
            memo: '',
            currencyCode: 'USD',
            transactionType: 'buy',
            amount: 500,
            baseRate: 1540,
            spreadRate: 1.75,
            preferentialRate: 80,
            appliedRate: 1545.39,
            krwAmount: 772695,
          },
        ]),
      )

      const { getSnapshot, syncNow } = await import('./transactionStore')

      const remoteRow = {
        id: 'legacy-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        recordType: 'exchange',
        customerName: '테스트고객 A(원격 갱신)',
        memo: '원격에서 갱신된 메모',
        currencyCode: 'USD',
        transactionType: 'buy',
        amount: 500,
        baseRate: 1540,
        spreadRate: 1.75,
        preferentialRate: 80,
        appliedRate: 1545.39,
        krwAmount: 772695,
      }
      fetchAllTransactionsMock.mockResolvedValue({ success: true, transactions: [remoteRow] })

      await syncNow()

      const [syncedTransaction] = getSnapshot()
      expect(syncedTransaction.customerName).toBe('테스트고객 A(원격 갱신)')
      expect(syncedTransaction.memo).toBe('원격에서 갱신된 메모')
    })
  })
})
