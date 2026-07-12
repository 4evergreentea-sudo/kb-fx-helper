import type { Transaction, TransactionClock } from '../model/types'

const defaultClock: TransactionClock = {
  createId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
}

/**
 * id와 createdAt을 부여해 Transaction을 생성한다.
 * clock을 주입하지 않으면 실제 crypto.randomUUID()/Date를 사용하고,
 * 테스트에서는 고정값을 주입해 순수하게 검증할 수 있다.
 */
export function createTransaction(
  input: Omit<Transaction, 'id' | 'createdAt'>,
  clock: TransactionClock = defaultClock,
): Transaction {
  return {
    ...input,
    id: clock.createId(),
    createdAt: clock.now(),
  }
}
