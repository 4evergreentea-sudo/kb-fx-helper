import { useState } from 'react'
import type { CurrencyCode } from '../../entities/currency'
import { useTransactionHistory } from '../../features/add-transaction'
import {
  createRemittanceCalculator,
  type RemittanceCalculatorInput,
  type RemittanceCalculatorResult,
} from '../../features/calculate-remittance'
import {
  shouldApplyOfficialRateToInput,
  useLoadExchangeRates,
} from '../../features/load-exchange-rates'
import { formatRate, parseFormattedNumber, parseNumberOrNull } from '../../shared/lib'
import { RemittanceForm } from './RemittanceForm'
import { RemittanceResult } from './RemittanceResult'
import { RemittanceSaveForm, type RemittanceSaveMessage } from './RemittanceSaveForm'

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'USD'
const DEFAULT_SPREAD_RATE = '1.75'
const DEFAULT_PREFERENTIAL_RATE = '0'
const DEFAULT_FEE = '0'

export function RemittancePanel() {
  const { addRemittanceTransaction } = useTransactionHistory()
  const {
    isLoading: isLoadingOfficialRate,
    errorMessage: officialRateErrorMessage,
    warningMessage: officialRateWarningMessage,
    metadata: officialRateMetadata,
    loadOfficialRate,
    resetOfficialRates,
  } = useLoadExchangeRates()

  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(
    DEFAULT_CURRENCY_CODE,
  )
  const [foreignAmount, setForeignAmount] = useState('')
  const [baseRate, setBaseRate] = useState('')
  const [spreadRate, setSpreadRate] = useState(DEFAULT_SPREAD_RATE)
  const [preferentialRate, setPreferentialRate] = useState(
    DEFAULT_PREFERENTIAL_RATE,
  )
  const [remittanceFee, setRemittanceFee] = useState(DEFAULT_FEE)
  const [cableFee, setCableFee] = useState(DEFAULT_FEE)

  const [result, setResult] = useState<RemittanceCalculatorResult | null>(
    null,
  )
  const [lastInput, setLastInput] = useState<RemittanceCalculatorInput | null>(
    null,
  )

  const [customerName, setCustomerName] = useState('')
  const [memo, setMemo] = useState('')
  const [saveMessage, setSaveMessage] = useState<RemittanceSaveMessage | null>(
    null,
  )

  const canSave =
    lastInput !== null &&
    result !== null &&
    result.validation.valid &&
    result.appliedRate !== null &&
    result.principalKRW !== null &&
    result.remittanceFee !== null &&
    result.cableFee !== null &&
    result.totalWithdrawalKRW !== null

  async function handleLoadOfficialRate() {
    const requestedCurrency = currencyCode
    const callResult = await loadOfficialRate(requestedCurrency)

if (
      shouldApplyOfficialRateToInput(
        requestedCurrency,
        currencyCode,
        callResult,
      )
    ) {
      setBaseRate(formatRate(callResult.baseRate))
    }
  }

  function handleCurrencyChange(nextCurrency: CurrencyCode) {
    resetOfficialRates()
    setCurrencyCode(nextCurrency)
  }

  function handleSubmit() {
    setSaveMessage(null)

    const parsedForeignAmount = parseFormattedNumber(foreignAmount)
    const parsedBaseRate = parseFormattedNumber(baseRate)
    const parsedSpreadRate = parseNumberOrNull(spreadRate)
    const parsedPreferentialRate = parseNumberOrNull(preferentialRate)
    const parsedRemittanceFee = parseFormattedNumber(remittanceFee)
    const parsedCableFee = parseFormattedNumber(cableFee)

    if (
      parsedForeignAmount === null ||
      parsedBaseRate === null ||
      parsedSpreadRate === null ||
      parsedPreferentialRate === null ||
      parsedRemittanceFee === null ||
      parsedCableFee === null
    ) {
      setLastInput(null)
      setResult({
        appliedRate: null,
        principalKRW: null,
        remittanceFee: null,
        cableFee: null,
        totalWithdrawalKRW: null,
        validation: { valid: false, message: '숫자를 올바르게 입력해주세요.' },
      })
      return
    }

    const input: RemittanceCalculatorInput = {
      currencyCode,
      foreignAmount: parsedForeignAmount,
      baseRate: parsedBaseRate,
      spreadRate: parsedSpreadRate,
      preferentialRate: parsedPreferentialRate,
      remittanceFee: parsedRemittanceFee,
      cableFee: parsedCableFee,
    }

    setLastInput(input)
    setResult(createRemittanceCalculator(input))
  }

  function handleReset() {
    resetOfficialRates()
    setCurrencyCode(DEFAULT_CURRENCY_CODE)
    setForeignAmount('')
    setBaseRate('')
    setSpreadRate(DEFAULT_SPREAD_RATE)
    setPreferentialRate(DEFAULT_PREFERENTIAL_RATE)
    setRemittanceFee(DEFAULT_FEE)
    setCableFee(DEFAULT_FEE)
    setResult(null)
    setLastInput(null)
    setCustomerName('')
    setMemo('')
    setSaveMessage(null)
  }

  function handleSave() {
    if (
      !lastInput ||
      !result ||
      result.appliedRate === null ||
      result.principalKRW === null ||
      result.remittanceFee === null ||
      result.cableFee === null ||
      result.totalWithdrawalKRW === null
    ) {
      return
    }

    const outcome = addRemittanceTransaction({
      customerName,
      currencyCode: lastInput.currencyCode,
      amount: lastInput.foreignAmount,
      baseRate: lastInput.baseRate,
      spreadRate: lastInput.spreadRate,
      preferentialRate: lastInput.preferentialRate,
      appliedRate: result.appliedRate,
      principalKRW: result.principalKRW,
      remittanceFee: result.remittanceFee,
      cableFee: result.cableFee,
      totalWithdrawalKRW: result.totalWithdrawalKRW,
      memo,
    })

    setSaveMessage(
      outcome.success
        ? { type: 'success', text: '해외송금 거래가 저장되었습니다.' }
        : {
            type: 'error',
            text: outcome.message ?? '거래를 저장하지 못했습니다.',
          },
    )

    if (outcome.success) {
      setCustomerName('')
      setMemo('')
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        해외송금 계산기
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RemittanceForm
          currencyCode={currencyCode}
          foreignAmount={foreignAmount}
          baseRate={baseRate}
          spreadRate={spreadRate}
          preferentialRate={preferentialRate}
          remittanceFee={remittanceFee}
          cableFee={cableFee}
          errorMessage={
            result && !result.validation.valid
              ? result.validation.message
              : undefined
          }
          isLoadingOfficialRate={isLoadingOfficialRate}
          officialRateMetadata={officialRateMetadata}
          officialRateErrorMessage={officialRateErrorMessage}
          officialRateWarningMessage={officialRateWarningMessage}
          onCurrencyChange={handleCurrencyChange}
          onForeignAmountChange={setForeignAmount}
          onBaseRateChange={setBaseRate}
          onSpreadRateChange={setSpreadRate}
          onPreferentialRateChange={setPreferentialRate}
          onRemittanceFeeChange={setRemittanceFee}
          onCableFeeChange={setCableFee}
          onLoadOfficialRate={handleLoadOfficialRate}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />

        <RemittanceResult
          appliedRate={result?.appliedRate ?? null}
          principalKRW={result?.principalKRW ?? null}
          remittanceFee={result?.remittanceFee ?? null}
          cableFee={result?.cableFee ?? null}
          totalWithdrawalKRW={result?.totalWithdrawalKRW ?? null}
        />
      </div>

      <RemittanceSaveForm
        customerName={customerName}
        memo={memo}
        canSave={canSave}
        saveMessage={saveMessage}
        onCustomerNameChange={setCustomerName}
        onMemoChange={setMemo}
        onSave={handleSave}
      />
    </section>
  )
}
