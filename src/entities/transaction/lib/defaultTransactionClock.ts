import type { TransactionClock } from '../model/types'

/** create*() 함수들이 clock을 주입받지 않았을 때 사용하는 실제 시각/id 생성기 */
export const defaultTransactionClock: TransactionClock = {
  createId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
}
