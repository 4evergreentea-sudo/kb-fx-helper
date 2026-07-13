import { describe, expect, it } from 'vitest'
import type { ExchangeTransaction } from '../../../entities/transaction'
import { buildTransactionsCsv } from './buildTransactionsCsv'

const transaction: ExchangeTransaction = {
  id: 'tx-1',
  createdAt: new Date(2026, 6, 12, 14, 30, 0).toISOString(),
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
  memo: '',
}

describe('buildTransactionsCsv', () => {
  it('헤더 행은 16개 컬럼을 정해진 순서로 포함한다', () => {
    const csv = buildTransactionsCsv([])
    const [header] = csv.split('\r\n')

    expect(header).toBe(
      '기록구분,고객명,거래일시,통화,거래구분,외화금액,기준환율,스프레드율,우대율,적용환율,원화금액,송금원금,송금수수료,전신료,총출금액,메모',
    )
    expect(header.split(',')).toHaveLength(16)
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
      '환전,테스트고객 A,2026-07-12 14:30:00,USD (미국 달러),매입,500,1540,1.75,80,1545.39,772695,,,,,',
    )
  })

  it('=,+,-,@ 로 시작할 수 있는 숫자 셀은 CSV Injection 방지 규칙이 적용된다', () => {
    const csv = buildTransactionsCsv([{ ...transaction, spreadRate: -1.5 }])
    const [, dataLine] = csv.split('\r\n')
    const cells = dataLine.split(',')

    expect(cells[7]).toBe("'-1.5")
  })

  it('고객명에 쉼표나 큰따옴표가 포함되면 큰따옴표로 감싸고 내부 큰따옴표를 이중화한다', () => {
    const csv = buildTransactionsCsv([{ ...transaction, customerName: '김"테스트", 고객' }])
    const [, dataLine] = csv.split('\r\n')

    expect(dataLine.startsWith('환전,"김""테스트"", 고객",')).toBe(true)
  })

  it('메모에 CSV Injection을 유발할 수 있는 값이 포함되면 앞에 따옴표를 붙여 무력화한다', () => {
    const csv = buildTransactionsCsv([{ ...transaction, memo: '=SUM(A1:A10)' }])
    const [, dataLine] = csv.split('\r\n')

    expect(dataLine.endsWith("'=SUM(A1:A10)")).toBe(true)
  })

  it('메모에 줄바꿈이 포함되면 큰따옴표로 감싸 하나의 셀로 유지한다', () => {
    const csv = buildTransactionsCsv([{ ...transaction, memo: '1줄\n2줄' }])
    const lines = csv.split('\r\n')

    // 메모 내부의 \n은 셀을 감싸는 큰따옴표 안에 있으므로 행 구분자(\r\n)로 split해도 줄이 늘어나지 않는다.
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('"1줄\n2줄"')
  })
})
