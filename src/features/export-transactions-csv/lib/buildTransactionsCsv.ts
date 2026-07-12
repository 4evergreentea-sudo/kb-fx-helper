import type { Transaction } from '../../../entities/transaction'
import { escapeCsvField } from './escapeCsvField'
import { mapTransactionToRow } from './mapTransactionToRow'

const CSV_HEADER = [
  '거래일시',
  '통화',
  '거래구분',
  '외화금액',
  '기준환율',
  '스프레드율',
  '우대율',
  '적용환율',
  '원화금액',
]

const LINE_BREAK = '\r\n'

function toCsvLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(',')
}

/**
 * 거래 목록을 RFC 4180 규칙을 따르는 CSV 문자열로 만든다.
 * BOM은 포함하지 않으며, 각 행은 CRLF로 구분한다.
 */
export function buildTransactionsCsv(transactions: Transaction[]): string {
  const lines = [
    toCsvLine(CSV_HEADER),
    ...transactions.map((transaction) => toCsvLine(mapTransactionToRow(transaction))),
  ]

  return lines.join(LINE_BREAK)
}
