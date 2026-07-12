import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../../entities/transaction'
import { createTransactionsCsvBlob } from './createTransactionsCsvBlob'

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

describe('createTransactionsCsvBlob', () => {
  it('Excel에서 CSV로 인식하도록 text/csv;charset=utf-8; 타입을 지정한다', () => {
    const blob = createTransactionsCsvBlob([transaction])

    expect(blob.type).toBe('text/csv;charset=utf-8;')
  })

  it('내용 맨 앞에 UTF-8 BOM 바이트 시퀀스(EF BB BF)가 포함된다', async () => {
    // Blob.text()는 표준상 UTF-8 디코딩 시 BOM을 제거하므로,
    // 실제로 BOM 바이트가 파일에 쓰였는지는 원본 바이트로 확인해야 한다.
    const blob = createTransactionsCsvBlob([transaction])
    const bytes = new Uint8Array(await blob.arrayBuffer())

    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
  })

  it('BOM 다음에는 CSV 헤더와 데이터가 이어진다', async () => {
    const blob = createTransactionsCsvBlob([transaction])
    const text = await blob.text()

    expect(text.startsWith('거래일시,통화,거래구분,')).toBe(true)
    expect(text).toContain('USD (미국 달러)')
  })
})
