import { useCallback, useState } from 'react'
import type { CurrencyCode } from '../../../shared/model'
import type {
  LoadExchangeRatesMetadata,
  LoadExchangeRatesStatus,
} from '../model/types'
import { loadOfficialExchangeRate } from './loadExchangeRates'

export interface UseLoadExchangeRatesResult {
  status: LoadExchangeRatesStatus
  isLoading: boolean
  errorMessage: string | null
  warningMessage: string | null
  metadata: LoadExchangeRatesMetadata | null
  loadOfficialRate: (currencyCode: CurrencyCode) => Promise<number | null>
}

export function useLoadExchangeRates(): UseLoadExchangeRatesResult {
  const [status, setStatus] = useState<LoadExchangeRatesStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<LoadExchangeRatesMetadata | null>(
    null,
  )

  const loadOfficialRate = useCallback(async (currencyCode: CurrencyCode) => {
    setStatus('loading')
    setErrorMessage(null)
    setWarningMessage(null)

    const result = await loadOfficialExchangeRate(currencyCode)

    if (result.status === 'success') {
      setStatus('success')
      setMetadata(result.metadata)
      return result.baseRate
    }

    if (result.status === 'fallback') {
      setStatus('fallback')
      setMetadata(result.metadata)
      setWarningMessage(result.message)
      return result.baseRate
    }

    setStatus('error')
    setMetadata(null)
    setErrorMessage(result.message)
    return null
  }, [])

  return {
    status,
    isLoading: status === 'loading',
    errorMessage,
    warningMessage,
    metadata,
    loadOfficialRate,
  }
}
