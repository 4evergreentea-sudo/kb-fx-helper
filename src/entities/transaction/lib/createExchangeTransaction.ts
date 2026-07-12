import type { CreateExchangeTransactionInput, ExchangeTransaction, TransactionClock } from '../model/types'
import { defaultTransactionClock } from './defaultTransactionClock'

/**
 * id와 createdAt을 부여해 ExchangeTransaction을 생성한다.
 * 유효성 검증(고객명 필수 등)은 이 함수의 책임이 아니며, 호출하는 쪽에서
 * validateCustomerName() 등으로 먼저 검증해야 한다.
 * clock을 주입하지 않으면 실제 crypto.randomUUID()/Date를 사용하고,
 * 테스트에서는 고정값을 주입해 순수하게 검증할 수 있다.
 */
export function createExchangeTransaction(
  input: CreateExchangeTransactionInput,
  clock: TransactionClock = defaultTransactionClock,
): ExchangeTransaction {
  return {
    ...input,
    id: clock.createId(),
    createdAt: clock.now(),
  }
}
