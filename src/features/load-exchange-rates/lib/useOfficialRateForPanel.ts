import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import type { CurrencyCode } from '../../../shared/model'
import { formatRate as defaultFormatRate } from '../../../shared/lib'
import type {
  LoadExchangeRatesMetadata,
  LoadOfficialRateCallResult,
} from '../model/types'
import { applyOfficialRateToPanel } from './applyOfficialRateResult'
import { useLoadExchangeRates } from './useLoadExchangeRates'

export interface UseOfficialRateForPanelInput {
  currencyCode: CurrencyCode
  setBaseRate: (value: string) => void
  clearLastInput: () => void
  clearResult: () => void
  onCurrencyChange: (nextCurrency: CurrencyCode) => void
  formatRate?: (rate: number) => string
}

export interface OfficialRatePanelHandlersDeps {
  currencyCode: CurrencyCode
  latestCurrencyCodeRef: MutableRefObject<CurrencyCode>
  loadOfficialRate: (
    currencyCode: CurrencyCode,
  ) => Promise<LoadOfficialRateCallResult>
  resetOfficialRates: () => void
  setBaseRate: (value: string) => void
  clearLastInput: () => void
  clearResult: () => void
  onCurrencyChange: (nextCurrency: CurrencyCode) => void
  formatRate: (rate: number) => string
}

export interface OfficialRatePanelHandlers {
  handleLoadOfficialRate: () => Promise<void>
  handleCurrencyChange: (nextCurrency: CurrencyCode) => void
}

export interface UseOfficialRateForPanelResult {
  isLoading: boolean
  errorMessage: string | null
  warningMessage: string | null
  metadata: LoadExchangeRatesMetadata | null
  handleLoadOfficialRate: () => Promise<void>
  handleCurrencyChange: (nextCurrency: CurrencyCode) => void
  resetOfficialRates: () => void
}

export function createOfficialRatePanelHandlers(
  deps: OfficialRatePanelHandlersDeps,
): OfficialRatePanelHandlers {
  async function handleLoadOfficialRate(): Promise<void> {
    const requestedCurrency = deps.currencyCode
    const callResult = await deps.loadOfficialRate(requestedCurrency)

    applyOfficialRateToPanel({
      requestedCurrency,
      currentCurrency: deps.latestCurrencyCodeRef.current,
      loadResult: callResult,
      formatRate: deps.formatRate,
      setBaseRate: deps.setBaseRate,
      clearLastInput: deps.clearLastInput,
      clearResult: deps.clearResult,
    })
  }

  function handleCurrencyChange(nextCurrency: CurrencyCode): void {
    deps.resetOfficialRates()
    deps.latestCurrencyCodeRef.current = nextCurrency
    deps.onCurrencyChange(nextCurrency)
  }

  return {
    handleLoadOfficialRate,
    handleCurrencyChange,
  }
}

export function useOfficialRateForPanel({
  currencyCode,
  setBaseRate,
  clearLastInput,
  clearResult,
  onCurrencyChange,
  formatRate = defaultFormatRate,
}: UseOfficialRateForPanelInput): UseOfficialRateForPanelResult {
  const {
    isLoading,
    errorMessage,
    warningMessage,
    metadata,
    loadOfficialRate,
    resetOfficialRates,
  } = useLoadExchangeRates()

  const latestCurrencyCodeRef = useRef(currencyCode)

  useEffect(() => {
    latestCurrencyCodeRef.current = currencyCode
  }, [currencyCode])

  const { handleLoadOfficialRate, handleCurrencyChange } = useMemo(
    () =>
      createOfficialRatePanelHandlers({
        currencyCode,
        latestCurrencyCodeRef,
        loadOfficialRate,
        resetOfficialRates,
        setBaseRate,
        clearLastInput,
        clearResult,
        onCurrencyChange,
        formatRate,
      }),
    [
      currencyCode,
      loadOfficialRate,
      resetOfficialRates,
      setBaseRate,
      clearLastInput,
      clearResult,
      onCurrencyChange,
      formatRate,
    ],
  )

  return {
    isLoading,
    errorMessage,
    warningMessage,
    metadata,
    handleLoadOfficialRate,
    handleCurrencyChange,
    resetOfficialRates,
  }
}
