import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConsultationRecord, ExchangeTransaction } from '../../../entities/transaction'

const downloadBlobMock = vi.fn()

vi.mock('./downloadBlob', () => ({
  downloadBlob: downloadBlobMock,
}))

const { exportTransactionsToCsv } = await import('./exportTransactionsToCsv')

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

const consultation: ConsultationRecord = {
  id: 'tx-consult-1',
  createdAt: new Date(2026, 6, 12, 15, 0, 0).toISOString(),
  recordType: 'consultation',
  customerName: '테스트고객 B',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문',
}

describe('exportTransactionsToCsv', () => {
  beforeEach(() => {
    downloadBlobMock.mockClear()
  })

  it('거래가 0건이면 다운로드하지 않고 한국어 안내 메시지를 반환한다', () => {
    const result = exportTransactionsToCsv([])

    expect(result).toEqual({
      success: false,
      message: '내보낼 거래 기록이 없습니다.',
    })
    expect(downloadBlobMock).not.toHaveBeenCalled()
  })

  it('거래가 있으면 CSV Blob을 만들어 다운로드하고 성공을 반환한다', () => {
    const result = exportTransactionsToCsv([transaction])

    expect(result).toEqual({ success: true })
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)

    const [blobArg, filenameArg] = downloadBlobMock.mock.calls[0] as [Blob, string]
    expect(blobArg).toBeInstanceOf(Blob)
    expect(filenameArg).toMatch(/^kb-fx-transactions-\d{8}-\d{6}\.csv$/)
  })

  it('CSV Injection을 유발할 수 있는 값이 포함되어도 최종 Blob에서 이스케이프된다', async () => {
    exportTransactionsToCsv([{ ...transaction, spreadRate: -1.5 }])

    const [blobArg] = downloadBlobMock.mock.calls[0] as [Blob, string]
    const text = await blobArg.text()

    expect(text).toContain("'-1.5")
  })

  it('환전 기록과 상담 기록이 섞여 있어도 예외 없이 CSV를 만든다(상담 기록을 제외하지 않음)', async () => {
    const result = exportTransactionsToCsv([transaction, consultation])

    expect(result).toEqual({ success: true })

    const [blobArg] = downloadBlobMock.mock.calls[0] as [Blob, string]
    const text = await blobArg.text()
    const lines = text.split('\r\n').filter((line) => line.length > 0)

    // BOM + 헤더 + 환전 1행 + 상담 1행
    expect(lines).toHaveLength(3)
    expect(text).toContain('USD (미국 달러)')
    expect(text).toContain('JPY (일본 엔)')
  })
})
