import { useState } from 'react'
import type { CurrencyCode } from '../../entities/currency'
import { useTransactionHistory } from '../../features/add-transaction'
import {
  createExchangeCalculator,
  type ExchangeCalculatorInput,
  type ExchangeCalculatorResult,
  type TransactionType,
} from '../../features/calculate-exchange'
import { parseNumberOrNull } from '../../shared/lib'
import { ExchangeForm } from './ExchangeForm'
import { ExchangeResult, type SaveMessage } from './ExchangeResult'

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'USD'
const DEFAULT_SPREAD_RATE = '1.75'
const DEFAULT_PREFERENTIAL_RATE = '0'
const DEFAULT_TRANSACTION_TYPE: TransactionType = 'buy'

export function ExchangePanel() {
  const { addTransaction } = useTransactionHistory()

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
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null)

  const canSave =
    lastInput !== null &&
    result !== null &&
    result.validation.valid &&
    result.appliedRate !== null &&
    result.krwAmount !== null

  function handleSubmit() {
    setSaveMessage(null)

    const parsedBaseRate = parseNumberOrNull(baseRate)
    const parsedSpreadRate = parseNumberOrNull(spreadRate)
    const parsedPreferentialRate = parseNumberOrNull(preferentialRate)
    const parsedAmount = parseNumberOrNull(amount)

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
    setSaveMessage(null)
  }

  function handleSave() {
    if (!lastInput || !result) {
      return
    }

    const outcome = addTransaction(lastInput, result)

    setSaveMessage(
      outcome.success
        ? { type: 'success', text: '거래가 저장되었습니다.' }
        : {
            type: 'error',
            text: outcome.message ?? '거래를 저장하지 못했습니다.',
          },
    )
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
          onCurrencyChange={setCurrencyCode}
          onBaseRateChange={setBaseRate}
          onSpreadRateChange={setSpreadRate}
          onPreferentialRateChange={setPreferentialRate}
          onTransactionTypeChange={setTransactionType}
          onAmountChange={setAmount}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />

        <ExchangeResult
          appliedRate={result?.appliedRate ?? null}
          krwAmount={result?.krwAmount ?? null}
          canSave={canSave}
          saveMessage={saveMessage}
          onSave={handleSave}
        />
      </div>
    </section>
  )
}
