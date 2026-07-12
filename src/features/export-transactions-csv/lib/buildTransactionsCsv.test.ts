import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../../entities/transaction'
import { buildTransactionsCsv } from './buildTransactionsCsv'

const transaction: Transaction = {
  id: 'tx-1',
  createdAt: new Date(2026, 6, 12, 14, 30, 0).toISOString(),
  currencyCode: 'USD',
  transactionType: 'buy',
  amount: 500,
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1545.39,
  krwAmount: 772695,
}

describe('buildTransactionsCsv', () => {
  it('헤더 행을 포함한다', () => {
    const csv = buildTransactionsCsv([])
    const [header] = csv.split('\r\n')

    expect(header).toBe(
      '거래일시,통화,거래구분,외화금액,기준환율,스프레드율,우대율,적용환율,원화금액',
    )
  })

  it('거래가 N건이면 헤더 포함 N+1개의 행을 만든다', () => {
    const csv = buildTransactionsCsv([transaction, transaction])
    const lines = csv.split('\r\n')

    expect(lines).toHaveLength(3)
  })

  it('행은 CRLF로 구분된다', () => {
    const csv = buildTransactionsCsv([transaction])

    expect(csv).toContain('\r\n')
  })

  it('데이터 행의 각 셀은 escape 규칙이 적용된 상태로 조립된다', () => {
    const csv = buildTransactionsCsv([transaction])
    const [, dataLine] = csv.split('\r\n')

    expect(dataLine).toBe(
      '2026-07-12 14:30:00,USD (미국 달러),매입,500,1540,1.75,80,1545.39,772695',
    )
  })

  it('=,+,-,@ 로 시작할 수 있는 숫자 셀은 CSV Injection 방지 규칙이 적용된다', () => {
    const csv = buildTransactionsCsv([{ ...transaction, spreadRate: -1.5 }])
    const [, dataLine] = csv.split('\r\n')
    const cells = dataLine.split(',')

    expect(cells[5]).toBe("'-1.5")
  })
})
