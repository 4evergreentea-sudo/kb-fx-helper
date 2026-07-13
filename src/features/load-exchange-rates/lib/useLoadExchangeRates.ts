import { useCallback, useRef, useState } from 'react'
import type { CurrencyCode } from '../../../shared/model'
import type {
  LoadExchangeRatesMetadata,
  LoadExchangeRatesStatus,
  LoadOfficialRateCallResult,
} from '../model/types'
import { loadOfficialExchangeRate } from './loadExchangeRates'
import { createRequestCoordinator } from './requestCoordinator'

export interface UseLoadExchangeRatesResult {
  status: LoadExchangeRatesStatus
  isLoading: boolean
  errorMessage: string | null
  warningMessage: string | null
  metadata: LoadExchangeRatesMetadata | null
  loadOfficialRate: (
    currencyCode: CurrencyCode,
  ) => Promise<LoadOfficialRateCallResult>
  resetOfficialRates: () => void
}

const IDLE_STATE = {
  status: 'idle' as const,
  errorMessage: null,
  warningMessage: null,
  metadata: null,
}

export function useLoadExchangeRates(): UseLoadExchangeRatesResult {
  const coordinatorRef = useRef(createRequestCoordinator())
  const [status, setStatus] = useState<LoadExchangeRatesStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<LoadExchangeRatesMetadata | null>(
    null,
  )

  const resetOfficialRates = useCallback(() => {
    coordinatorRef.current.invalidate()
    setStatus(IDLE_STATE.status)
    setErrorMessage(IDLE_STATE.errorMessage)
    setWarningMessage(IDLE_STATE.warningMessage)
    setMetadata(IDLE_STATE.metadata)
  }, [])

  const loadOfficialRate = useCallback(async (currencyCode: CurrencyCode) => {
    const coordinator = coordinatorRef.current
    const requestId = coordinator.start()

    setStatus('loading')
    setErrorMessage(null)
    setWarningMessage(null)

    const result = await loadOfficialExchangeRate(currencyCode)
    if (!coordinator.isCurrent(requestId)) {
      return {
        applied: false,
        requestId,
        latestRequestId: coordinator.getLatestRequestId(),
        reason: 'stale' as const,
      }
    }

    if (result.status === 'success') {
      setStatus('success')
      setMetadata(result.metadata)
      return {
        applied: true,
        requestId,
        latestRequestId: requestId,
        baseRate: result.baseRate,
      }
    }

    if (result.status === 'fallback') {
      setStatus('fallback')
      setMetadata(result.metadata)
      setWarningMessage(result.message)
      return {
        applied: true,
        requestId,
        latestRequestId: requestId,
        baseRate: result.baseRate,
      }
    }

    setStatus('error')
    setMetadata(null)
    setErrorMessage(result.message)
    return {
      applied: false,
      requestId,
      latestRequestId: requestId,
      reason: 'error' as const,
    }
  }, [])

  return {
    status,
    isLoading: status === 'loading',
    errorMessage,
    warningMessage,
    metadata,
    loadOfficialRate,
    resetOfficialRates,
  }
}
