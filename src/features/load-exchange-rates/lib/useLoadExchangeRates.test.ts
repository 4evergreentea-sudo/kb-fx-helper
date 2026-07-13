import { describe, expect, it } from 'vitest'
import {
  OFFICIAL_RATES_IDLE_UI_STATE,
  resetOfficialRatesUiState,
} from './officialRatesResetState'
import { createRequestCoordinator } from './requestCoordinator'

describe('resetOfficialRatesUiState', () => {
  it('invalidate 이후 기존 request id가 stale이 된다', () => {
    const coordinator = createRequestCoordinator()
    const requestId = coordinator.start()

    resetOfficialRatesUiState(coordinator)

    expect(coordinator.isCurrent(requestId)).toBe(false)
  })

  it('resetOfficialRates 호출 후 idle UI 상태를 반환한다', () => {
    const coordinator = createRequestCoordinator()
    coordinator.start()

    const state = resetOfficialRatesUiState(coordinator)

    expect(state.status).toBe('idle')
    expect(state.metadata).toBeNull()
    expect(state.warningMessage).toBeNull()
    expect(state.errorMessage).toBeNull()
    expect(state.status === 'loading').toBe(false)
    expect(state).toEqual(OFFICIAL_RATES_IDLE_UI_STATE)
  })
})
