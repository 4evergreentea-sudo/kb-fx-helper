import type {
  LoadExchangeRatesMetadata,
  LoadExchangeRatesStatus,
} from '../model/types'
import type { RequestCoordinator } from './requestCoordinator'

export interface OfficialRatesUiState {
  status: LoadExchangeRatesStatus
  errorMessage: string | null
  warningMessage: string | null
  metadata: LoadExchangeRatesMetadata | null
}

export const OFFICIAL_RATES_IDLE_UI_STATE: OfficialRatesUiState = {
  status: 'idle',
  errorMessage: null,
  warningMessage: null,
  metadata: null,
}

/** resetOfficialRates가 적용하는 coordinator invalidate + UI 초기 상태 */
export function resetOfficialRatesUiState(
  coordinator: RequestCoordinator,
): OfficialRatesUiState {
  coordinator.invalidate()
  return OFFICIAL_RATES_IDLE_UI_STATE
}
