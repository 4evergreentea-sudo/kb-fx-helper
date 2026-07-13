import type { ConsultationRecord, CreateConsultationRecordInput, TransactionClock } from '../model/types'
import { defaultTransactionClock } from './defaultTransactionClock'

/**
 * id와 createdAt을 부여해 ConsultationRecord를 생성한다.
 * 유효성 검증(고객명·메모 필수 등)은 이 함수의 책임이 아니며, 호출하는 쪽에서
 * validateCustomerName()/validateConsultationMemo()로 먼저 검증해야 한다.
 * clock을 주입하지 않으면 실제 crypto.randomUUID()/Date를 사용하고,
 * 테스트에서는 고정값을 주입해 순수하게 검증할 수 있다.
 */
export function createConsultationRecord(
  input: CreateConsultationRecordInput,
  clock: TransactionClock = defaultTransactionClock,
): ConsultationRecord {
  return {
    ...input,
    id: clock.createId(),
    createdAt: clock.now(),
  }
}
