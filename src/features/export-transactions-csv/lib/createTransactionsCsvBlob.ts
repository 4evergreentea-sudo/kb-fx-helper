import type { Transaction } from '../../../entities/transaction'
import { buildTransactionsCsv } from './buildTransactionsCsv'

/** UTF-8 BOM. Excel에서 한글 등 비-ASCII 문자가 깨지지 않도록 CSV 앞에 붙인다 */
const UTF8_BOM = '\uFEFF'

/**
 * 거래 목록으로부터 BOM이 포함된 UTF-8 CSV Blob을 만든다.
 * Excel에서 더블클릭으로 열었을 때 한글이 깨지지 않도록 charset을 명시한다.
 */
export function createTransactionsCsvBlob(transactions: Transaction[]): Blob {
  const csv = UTF8_BOM + buildTransactionsCsv(transactions)

  return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
}
