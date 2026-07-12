import { useState } from 'react'
import type { CurrencyCode } from '../../entities/currency'
import {
  createRemittanceCalculator,
  type RemittanceCalculatorResult,
} from '../../features/calculate-remittance'
import { parseNumberOrNull } from '../../shared/lib'
import { RemittanceForm } from './RemittanceForm'
import { RemittanceResult } from './RemittanceResult'

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'USD'
const DEFAULT_SPREAD_RATE = '1.75'
const DEFAULT_PREFERENTIAL_RATE = '0'
const DEFAULT_FEE = '0'

export function RemittancePanel() {
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

  function handleSubmit() {
    const parsedForeignAmount = parseNumberOrNull(foreignAmount)
    const parsedBaseRate = parseNumberOrNull(baseRate)
    const parsedSpreadRate = parseNumberOrNull(spreadRate)
    const parsedPreferentialRate = parseNumberOrNull(preferentialRate)
    const parsedRemittanceFee = parseNumberOrNull(remittanceFee)
    const parsedCableFee = parseNumberOrNull(cableFee)

    if (
      parsedForeignAmount === null ||
      parsedBaseRate === null ||
      parsedSpreadRate === null ||
      parsedPreferentialRate === null ||
      parsedRemittanceFee === null ||
      parsedCableFee === null
    ) {
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

    setResult(
      createRemittanceCalculator({
        currencyCode,
        foreignAmount: parsedForeignAmount,
        baseRate: parsedBaseRate,
        spreadRate: parsedSpreadRate,
        preferentialRate: parsedPreferentialRate,
        remittanceFee: parsedRemittanceFee,
        cableFee: parsedCableFee,
      }),
    )
  }

  function handleReset() {
    setCurrencyCode(DEFAULT_CURRENCY_CODE)
    setForeignAmount('')
    setBaseRate('')
    setSpreadRate(DEFAULT_SPREAD_RATE)
    setPreferentialRate(DEFAULT_PREFERENTIAL_RATE)
    setRemittanceFee(DEFAULT_FEE)
    setCableFee(DEFAULT_FEE)
    setResult(null)
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
          onCurrencyChange={setCurrencyCode}
          onForeignAmountChange={setForeignAmount}
          onBaseRateChange={setBaseRate}
          onSpreadRateChange={setSpreadRate}
          onPreferentialRateChange={setPreferentialRate}
          onRemittanceFeeChange={setRemittanceFee}
          onCableFeeChange={setCableFee}
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
    </section>
  )
}
