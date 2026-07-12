import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ConsultationRecord,
  ExchangeTransaction,
  RemittanceTransaction,
} from '../../../entities/transaction'

const getSupabaseClientMock = vi.fn()

vi.mock('../../../shared/api', () => ({
  getSupabaseClient: getSupabaseClientMock,
}))

const exchangeTransaction: ExchangeTransaction = {
  id: 'tx-1',
  createdAt: '2026-07-12T00:00:00.000Z',
  recordType: 'exchange',
  customerName: '테스트고객 A',
  currencyCode: 'USD',
  transactionType: 'buy',
  amount: 500,
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1545.39,
  krwAmount: 772695,
  memo: '여행 환전',
}

const remittanceTransaction: RemittanceTransaction = {
  id: 'tx-2',
  createdAt: '2026-07-12T01:00:00.000Z',
  recordType: 'remittance',
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
  memo: '유학 자금 송금',
}

const consultationRecord: ConsultationRecord = {
  id: 'tx-3',
  createdAt: '2026-07-12T02:00:00.000Z',
  recordType: 'consultation',
  customerName: '테스트고객 B',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문',
}

const exchangeRow = {
  id: 'tx-1',
  created_at: '2026-07-12T00:00:00.000Z',
  record_type: 'exchange',
  customer_name: '테스트고객 A',
  memo: '여행 환전',
  currency_code: 'USD',
  amount: 500,
  transaction_type: 'buy',
  base_rate: 1540,
  spread_rate: 1.75,
  preferential_rate: 80,
  applied_rate: 1545.39,
  krw_amount: 772695,
  principal_krw: null,
  remittance_fee: null,
  cable_fee: null,
  total_withdrawal_krw: null,
  user_id: 'user-1',
}

const remittanceRow = {
  id: 'tx-2',
  created_at: '2026-07-12T01:00:00.000Z',
  record_type: 'remittance',
  customer_name: '테스트고객 C',
  memo: '유학 자금 송금',
  currency_code: 'USD',
  amount: 1000,
  transaction_type: null,
  base_rate: 1400,
  spread_rate: 1.75,
  preferential_rate: 80,
  applied_rate: 1404.9,
  krw_amount: null,
  principal_krw: 1404900,
  remittance_fee: 5000,
  cable_fee: 8000,
  total_withdrawal_krw: 1417900,
  user_id: 'user-1',
}

const consultationRow = {
  id: 'tx-3',
  created_at: '2026-07-12T02:00:00.000Z',
  record_type: 'consultation',
  customer_name: '테스트고객 B',
  memo: '환전 상담 방문',
  currency_code: 'JPY',
  amount: 100000,
  transaction_type: null,
  base_rate: null,
  spread_rate: null,
  preferential_rate: null,
  applied_rate: null,
  krw_amount: null,
  principal_krw: null,
  remittance_fee: null,
  cable_fee: null,
  total_withdrawal_krw: null,
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

    it('현재 사용자(RLS로 제한됨)의 exchange/remittance/consultation 행을 모두 최신순으로 조회해 도메인 모델로 변환한다', async () => {
      const fakeClient = createFakeClient({
        selectResult: { data: [exchangeRow, remittanceRow, consultationRow], error: null },
      })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      const result = await fetchAllTransactions()

      expect(result).toEqual({
        success: true,
        transactions: [exchangeTransaction, remittanceTransaction, consultationRecord],
      })
      expect(fakeClient.__mocks.from).toHaveBeenCalledWith('transactions')
      expect(fakeClient.__mocks.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('형태가 올바르지 않은 row는 결과에서 제외한다', async () => {
      const brokenRow = { ...exchangeRow, amount: 'not-a-number' }
      const fakeClient = createFakeClient({
        selectResult: { data: [exchangeRow, brokenRow], error: null },
      })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      const result = await fetchAllTransactions()

      expect(result.transactions).toEqual([exchangeTransaction])
    })

    it('마이그레이션 이전 레거시 row(record_type/customer_name/memo 컬럼 없음)도 exchange로 안전하게 변환한다', async () => {
      const legacyRow = {
        id: 'legacy-1',
        created_at: '2025-01-01T00:00:00.000Z',
        currency_code: 'USD',
        transaction_type: 'sell',
        amount: 1000,
        base_rate: 1300,
        spread_rate: 1.5,
        preferential_rate: 50,
        applied_rate: 1298.05,
        krw_amount: 1298050,
        user_id: 'user-1',
      }
      const fakeClient = createFakeClient({ selectResult: { data: [legacyRow], error: null } })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { fetchAllTransactions } = await import('./supabaseTransactionRepository')

      const result = await fetchAllTransactions()

      expect(result.transactions).toEqual([
        {
          id: 'legacy-1',
          createdAt: '2025-01-01T00:00:00.000Z',
          recordType: 'exchange',
          customerName: '',
          memo: '',
          currencyCode: 'USD',
          transactionType: 'sell',
          amount: 1000,
          baseRate: 1300,
          spreadRate: 1.5,
          preferentialRate: 50,
          appliedRate: 1298.05,
          krwAmount: 1298050,
        },
      ])
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
    it.each([
      ['환전', exchangeTransaction, 'tx-1'],
      ['해외송금', remittanceTransaction, 'tx-2'],
      ['상담', consultationRecord, 'tx-3'],
    ])('%s 거래를 전달받은 user_id를 포함한 row로 저장을 요청한다', async (_label, transaction, id) => {
      const fakeClient = createFakeClient()
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { insertTransaction } = await import('./supabaseTransactionRepository')

      const result = await insertTransaction(transaction, 'user-1')

      expect(result).toEqual({ success: true })
      expect(fakeClient.__mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id, user_id: 'user-1', record_type: transaction.recordType }),
      )
    })

    it('저장에 실패하면 success: false와 한국어 메시지를 반환한다', async () => {
      const fakeClient = createFakeClient({ insertResult: { error: new Error('실패') } })
      getSupabaseClientMock.mockReturnValue(fakeClient)

      const { insertTransaction } = await import('./supabaseTransactionRepository')

      const result = await insertTransaction(exchangeTransaction, 'user-1')

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
