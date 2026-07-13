import { useState } from 'react'
import type { CurrencyCode } from '../../entities/currency'
import { useTransactionHistory } from '../../features/add-transaction'
import {
  createExchangeCalculator,
  type ExchangeCalculatorInput,
  type ExchangeCalculatorResult,
  type TransactionType,
} from '../../features/calculate-exchange'
import {
  shouldApplyOfficialRateToInput,
  useLoadExchangeRates,
} from '../../features/load-exchange-rates'
import { formatRate, parseFormattedNumber, parseNumberOrNull } from '../../shared/lib'
import { ExchangeForm } from './ExchangeForm'
import { ExchangeResult } from './ExchangeResult'
import { TransactionSaveForm, type SaveMessage } from './TransactionSaveForm'

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'USD'
const DEFAULT_SPREAD_RATE = '1.75'
const DEFAULT_PREFERENTIAL_RATE = '0'
const DEFAULT_TRANSACTION_TYPE: TransactionType = 'buy'

export function ExchangePanel() {
  const { addTransaction } = useTransactionHistory()
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
  const [baseRate, setBaseRate] = useState('')
  const [spreadRate, setSpreadRate] = useState(DEFAULT_SPREAD_RATE)
  const [preferentialRate, setPreferentialRate] = useState(
    DEFAULT_PREFERENTIAL_RATE,
  )
  const [transactionType, setTransactionType] = useState<TransactionType>(
    DEFAULT_TRANSACTION_TYPE,
  )
  const [amount, setAmount] = useState('')

  const [result, setResult] = useState<ExchangeCalculatorResult | null>(null)
  const [lastInput, setLastInput] = useState<ExchangeCalculatorInput | null>(
    null,
  )

  const [customerName, setCustomerName] = useState('')
  const [memo, setMemo] = useState('')
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null)

  const canSave =
    lastInput !== null &&
    result !== null &&
    result.validation.valid &&
    result.appliedRate !== null &&
    result.krwAmount !== null

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

    const parsedBaseRate = parseFormattedNumber(baseRate)
    const parsedSpreadRate = parseNumberOrNull(spreadRate)
    const parsedPreferentialRate = parseNumberOrNull(preferentialRate)
    const parsedAmount = parseFormattedNumber(amount)

    if (
      parsedBaseRate === null ||
      parsedSpreadRate === null ||
      parsedPreferentialRate === null ||
      parsedAmount === null
    ) {
      setLastInput(null)
      setResult({
        appliedRate: null,
        krwAmount: null,
        validation: { valid: false, message: '숫자를 올바르게 입력해주세요.' },
      })
      return
    }

    const input: ExchangeCalculatorInput = {
      currencyCode,
      baseRate: parsedBaseRate,
      spreadRate: parsedSpreadRate,
      preferentialRate: parsedPreferentialRate,
      transactionType,
      amount: parsedAmount,
    }

    setLastInput(input)
    setResult(createExchangeCalculator(input))
  }

  function handleReset() {
    setCurrencyCode(DEFAULT_CURRENCY_CODE)
    setBaseRate('')
    setSpreadRate(DEFAULT_SPREAD_RATE)
    setPreferentialRate(DEFAULT_PREFERENTIAL_RATE)
    setTransactionType(DEFAULT_TRANSACTION_TYPE)
    setAmount('')
    setResult(null)
    setLastInput(null)
    setCustomerName('')
    setMemo('')
    setSaveMessage(null)
  }

  function handleSave() {
    if (!lastInput || !result || result.appliedRate === null || result.krwAmount === null) {
      return
    }

    const outcome = addTransaction({
      customerName,
      currencyCode: lastInput.currencyCode,
      transactionType: lastInput.transactionType,
      amount: lastInput.amount,
      baseRate: lastInput.baseRate,
      spreadRate: lastInput.spreadRate,
      preferentialRate: lastInput.preferentialRate,
      appliedRate: result.appliedRate,
      krwAmount: result.krwAmount,
      memo,
    })

    setSaveMessage(
      outcome.success
        ? { type: 'success', text: '거래가 저장되었습니다.' }
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
        환전 계산기
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExchangeForm
          currencyCode={currencyCode}
          baseRate={baseRate}
          spreadRate={spreadRate}
          preferentialRate={preferentialRate}
          transactionType={transactionType}
          amount={amount}
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
          onBaseRateChange={setBaseRate}
          onSpreadRateChange={setSpreadRate}
          onPreferentialRateChange={setPreferentialRate}
          onTransactionTypeChange={setTransactionType}
          onAmountChange={setAmount}
          onLoadOfficialRate={handleLoadOfficialRate}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />

        <ExchangeResult
          appliedRate={result?.appliedRate ?? null}
          krwAmount={result?.krwAmount ?? null}
        />
      </div>

      <TransactionSaveForm
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
