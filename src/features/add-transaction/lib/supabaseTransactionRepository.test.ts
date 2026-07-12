import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../../../entities/transaction'

const getSupabaseClientMock = vi.fn()

vi.mock('../../../shared/api', () => ({
  getSupabaseClient: getSupabaseClientMock,
}))

const transaction: Transaction = {
  id: 'tx-1',
  createdAt: '2026-07-12T00:00:00.000Z',
  currencyCode: 'USD',
  transactionType: 'buy',
  amount: 500,
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1545.39,
  krwAmount: 772695,
}

const validRow = {
  id: 'tx-1',
  created_at: '2026-07-12T00:00:00.000Z',
  currency_code: 'USD',
  transaction_type: 'buy',
  amount: 500,
  base_rate: 1540,
  spread_rate: 1.75,
  preferential_rate: 80,
  applied_rate: 1545.39,
  krw_amount: 772695,
  user_id: 'user-1',
}

function createFakeClient({
  selectResult = { data: [] as unknown[], error: null as unknown },
  insertResult = { error: null as unknown },
  deleteResult = { error: null as unknown },
}: {
  selectResult?: { data: unknown[] | null; error: unknown }
  insertResult?: { error: unknown }
  deleteResult?: { error: unknown }
} = {}) {
  const eq = vi.fn().mockResolvedValue(deleteResult)
  const del = vi.fn(() => ({ eq }))
  const order = vi.fn().mockResolvedValue(selectResult)
  const select = vi.fn(() => ({ order }))
  const insert = vi.fn().mockResolvedValue(insertResult)
  const from = vi.fn(() => ({ select, insert, delete: del }))

  return { from, __mocks: { from, select, order, insert, delete: del, eq } }
}

describe('supabaseTransactionRepository', () => {
  afterEach(() => {
    vi.resetModules()
    getSupabaseClientMock.mockReset()
  })

  describe('fetchAllTransactions', () => {
    it('Supabase가 설정되지 않으면 success: false와 빈 배열을 반환한다', async () => {
      getSupabaseClientMock.mockReturnValue(null)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      await expect(fetchAllTransactions()).resolves.toEqual({ success: false, transactions: [] })
    })

    it('현재 사용자(RLS로 제한됨)의 행만 최신순으로 조회해 도메인 모델로 변환한다', async () => {
      const fakeClient = createFakeClient({ selectResult: { data: [validRow], error: null } })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      const result = await fetchAllTransactions()

      expect(result).toEqual({ success: true, transactions: [transaction] })
      expect(fakeClient.__mocks.from).toHaveBeenCalledWith('transactions')
      expect(fakeClient.__mocks.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('형태가 올바르지 않은 row는 결과에서 제외한다', async () => {
      const brokenRow = { ...validRow, amount: 'not-a-number' }
      const fakeClient = createFakeClient({
        selectResult: { data: [validRow, brokenRow], error: null },
      })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      const result = await fetchAllTransactions()

      expect(result.transactions).toEqual([transaction])
    })

    it('조회 중 오류가 발생하면 success: false와 빈 배열을 반환한다', async () => {
      const fakeClient = createFakeClient({
        selectResult: { data: null, error: new Error('네트워크 오류') },
      })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      await expect(fetchAllTransactions()).resolves.toEqual({ success: false, transactions: [] })
    })
  })

  describe('insertTransaction', () => {
    it('전달받은 user_id를 포함한 row로 저장을 요청한다', async () => {
      const fakeClient = createFakeClient()
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { insertTransaction } = await import('./supabaseTransactionRepository')

      const result = await insertTransaction(transaction, 'user-1')

      expect(result).toEqual({ success: true })
      expect(fakeClient.__mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tx-1', user_id: 'user-1' }),
      )
    })

    it('저장에 실패하면 success: false와 한국어 메시지를 반환한다', async () => {
      const fakeClient = createFakeClient({ insertResult: { error: new Error('실패') } })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { insertTransaction } = await import('./supabaseTransactionRepository')

      const result = await insertTransaction(transaction, 'user-1')

      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })
  })

  describe('removeRemoteTransaction', () => {
    it('id로 삭제를 요청하고 성공하면 success: true를 반환한다', async () => {
      const fakeClient = createFakeClient()
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { removeRemoteTransaction } = await import('./supabaseTransactionRepository')

      const result = await removeRemoteTransaction('tx-1')

      expect(result).toEqual({ success: true })
      expect(fakeClient.__mocks.eq).toHaveBeenCalledWith('id', 'tx-1')
    })

    it('삭제에 실패하면 success: false와 한국어 메시지를 반환한다', async () => {
      const fakeClient = createFakeClient({ deleteResult: { error: new Error('실패') } })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { removeRemoteTransaction } = await import('./supabaseTransactionRepository')

      const result = await removeRemoteTransaction('tx-1')

      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })
  })
})
