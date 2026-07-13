/**
 * customerName/memo/recordType이 없는 과거 데이터(레거시 localStorage/Supabase 행)를
 * 현재 스키마 형태의 후보 객체로 정규화한다.
 * 검증(형태가 실제로 올바른지)은 이 함수의 책임이 아니며, isTransaction()이 이어서 담당한다.
 * 알아볼 수 없는 값은 그대로 반환해 isTransaction()이 걸러내도록 한다(기존 동작과 동일).
 */
export function migrateLegacyTransaction(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value
  }

  const candidate = value as Record<string, unknown>

  if (
    candidate.recordType === 'exchange' ||
    candidate.recordType === 'remittance' ||
    candidate.recordType === 'consultation'
  ) {
    return {
      ...candidate,
      customerName: typeof candidate.customerName === 'string' ? candidate.customerName : '',
      memo: typeof candidate.memo === 'string' ? candidate.memo : '',
    }
  }

  const looksLikeLegacyExchangeTransaction =
    typeof candidate.transactionType === 'string' &&
    'baseRate' in candidate &&
    'krwAmount' in candidate

  if (looksLikeLegacyExchangeTransaction) {
    return {
      ...candidate,
      recordType: 'exchange',
      customerName: typeof candidate.customerName === 'string' ? candidate.customerName : '',
      memo: typeof candidate.memo === 'string' ? candidate.memo : '',
    }
  }

  return value
}
