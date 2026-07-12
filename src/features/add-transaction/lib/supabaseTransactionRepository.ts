import { getSupabaseClient } from '../../../shared/api'
import type { Transaction } from '../../../entities/transaction'
import { fromTransactionRow, toTransactionRow } from './transactionSupabaseMapper'
import type { TransactionRow } from './transactionSupabaseMapper'

const TABLE_NAME = 'transactions'

/** Supabase 원격 작업 결과. 실패 시 한국어 안내 메시지를 포함할 수 있다 */
export interface SupabaseOperationResult {
  success: boolean
  message?: string
}

/** 원격 목록 조회 결과. success가 false면 네트워크/서버 오류로 조회에 실패했음을 의미한다 */
export interface FetchTransactionsResult {
  success: boolean
  transactions: Transaction[]
}

/**
 * 현재 로그인된 사용자(RLS로 제한됨)의 거래기록(환전/해외송금/상담)을 최신순으로 조회한다.
 * Supabase가 설정되지 않았거나 조회에 실패하면 success: false와 빈 배열을 반환한다
 * (병합/fallback 여부 판단은 호출하는 쪽의 책임).
 * 형태가 올바르지 않은 row는 결과에서 제외하고 콘솔에 경고를 남긴다(개인정보는 로그에 남기지 않음).
 */
export async function fetchAllTransactions(): Promise<FetchTransactionsResult> {
  const client = getSupabaseClient()

  if (!client) {
    return { success: false, transactions: [] }
  }

  try {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.error('거래기록 원격 조회 실패', error)
      return { success: false, transactions: [] }
    }

    const transactions: Transaction[] = []

    for (const row of data as TransactionRow[]) {
      const parsed = fromTransactionRow(row)

      if (parsed) {
        transactions.push(parsed)
      } else {
        console.warn('형식이 올바르지 않은 거래기록 행을 제외합니다', { id: row.id })
      }
    }

    return { success: true, transactions }
  } catch (error) {
    console.error('거래기록 원격 조회 실패', error)
    return { success: false, transactions: [] }
  }
}

/** 거래기록(환전/해외송금/상담) 1건을 user_id와 함께 원격에 추가한다 */
export async function insertTransaction(
  transaction: Transaction,
  userId: string,
): Promise<SupabaseOperationResult> {
  const client = getSupabaseClient()

  if (!client) {
    return { success: false, message: 'Supabase가 설정되지 않았습니다.' }
  }

  try {
    const { error } = await client.from(TABLE_NAME).insert(toTransactionRow(transaction, userId))

    if (error) {
      console.error('거래기록 원격 저장 실패', error)
      return { success: false, message: '거래기록을 클라우드에 저장하지 못했습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('거래기록 원격 저장 실패', error)
    return { success: false, message: '거래기록을 클라우드에 저장하지 못했습니다.' }
  }
}

/**
 * id로 거래 1건을 원격에서 삭제한다.
 * 대상 row가 없어도(이미 삭제됐거나 원래 없었던 경우) 에러 없이 성공으로 처리한다.
 */
export async function removeRemoteTransaction(id: string): Promise<SupabaseOperationResult> {
  const client = getSupabaseClient()

  if (!client) {
    return { success: false, message: 'Supabase가 설정되지 않았습니다.' }
  }

  try {
    const { error } = await client.from(TABLE_NAME).delete().eq('id', id)

    if (error) {
      console.error('거래기록 원격 삭제 실패', error)
      return { success: false, message: '거래기록을 클라우드에서 삭제하지 못했습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('거래기록 원격 삭제 실패', error)
    return { success: false, message: '거래기록을 클라우드에서 삭제하지 못했습니다.' }
  }
}
