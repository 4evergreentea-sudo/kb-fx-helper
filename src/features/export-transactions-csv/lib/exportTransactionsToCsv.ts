import type { Transaction } from '../../../entities/transaction'
import type { CsvExportResult } from '../model/types'
import { createTransactionsCsvBlob } from './createTransactionsCsvBlob'
import { downloadBlob } from './downloadBlob'
import { generateCsvFilename } from './generateCsvFilename'

/**
 * 거래 목록을 CSV 파일로 다운로드한다. UI는 CSV 조립이나 다운로드 방식을
 * 알 필요 없이 결과(성공 여부/안내 메시지)만 사용한다.
 */
export function exportTransactionsToCsv(transactions: Transaction[]): CsvExportResult {
  if (transactions.length === 0) {
    return {
      success: false,
      message: '내보낼 거래 기록이 없습니다.',
    }
  }

  const blob = createTransactionsCsvBlob(transactions)
  const filename = generateCsvFilename(new Date())

  downloadBlob(blob, filename)

  return { success: true }
}
