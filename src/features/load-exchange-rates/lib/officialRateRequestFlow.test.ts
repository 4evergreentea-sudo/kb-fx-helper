import { describe, expect, it } from 'vitest'
import type { LoadExchangeRatesMetadata } from '../model/types'
import { createRequestCoordinator } from './requestCoordinator'

interface LoaderState {
  status: string
  metadata: LoadExchangeRatesMetadata | null
}

function commitResult(
  requestId: number,
  coordinator: ReturnType<typeof createRequestCoordinator>,
  metadata: LoadExchangeRatesMetadata,
  state: LoaderState,
): LoaderState {
  if (!coordinator.isCurrent(requestId)) {
    return state
  }

  return {
    status: 'success',
    metadata,
  }
}

describe('official rate request flow', () => {
  it('먼저 시작한 요청이 나중 요청보다 늦게 완료되어도 최신 결과만 표시한다', () => {
    const coordinator = createRequestCoordinator()
    let state: LoaderState = { status: 'idle', metadata: null }

    const firstRequestId = coordinator.start()
    const secondRequestId = coordinator.start()

    const firstMetadata = {
      baseDate: '2026-07-10',
      source: '한국수출입은행',
      fromCache: false,
    }
    const secondMetadata = {
      baseDate: '2026-07-12',
      source: '한국수출입은행',
      fromCache: false,
    }

    state = commitResult(secondRequestId, coordinator, secondMetadata, state)
    state = commitResult(firstRequestId, coordinator, firstMetadata, state)

    expect(state.metadata).toEqual(secondMetadata)
    expect(coordinator.isCurrent(firstRequestId)).toBe(false)
  })
})
