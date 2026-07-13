import { describe, expect, it } from 'vitest'
import { createRequestCoordinator } from './requestCoordinator'

describe('createRequestCoordinator', () => {
  it('invalidate 이후 이전 요청은 최신이 아니다', () => {
    const coordinator = createRequestCoordinator()
    const firstRequestId = coordinator.start()

    coordinator.invalidate()

    expect(coordinator.isCurrent(firstRequestId)).toBe(false)
    expect(coordinator.getLatestRequestId()).toBeGreaterThan(firstRequestId)
  })
})
