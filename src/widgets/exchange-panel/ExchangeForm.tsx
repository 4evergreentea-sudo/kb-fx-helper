import type { FormEvent } from 'react'
import { CURRENCIES, SUPPORTED_CURRENCY_CODES } from '../../entities/currency'
import type { CurrencyCode } from '../../entities/currency'
import type { TransactionType } from '../../features/calculate-exchange'
import {
  OfficialRateField,
  type LoadExchangeRatesMetadata,
} from '../../features/load-exchange-rates'
import { formatNumericInput } from '../../shared/lib'

interface ExchangeFormProps {
  currencyCode: CurrencyCode
  baseRate: string
  spreadRate: string
  preferentialRate: string
  transactionType: TransactionType
  amount: string
  errorMessage?: string
  isLoadingOfficialRate: boolean
  officialRateMetadata: LoadExchangeRatesMetadata | null
  officialRateErrorMessage: string | null
  officialRateWarningMessage: string | null
  onCurrencyChange: (code: CurrencyCode) => void
  onBaseRateChange: (value: string) => void
  onSpreadRateChange: (value: string) => void
  onPreferentialRateChange: (value: string) => void
  onTransactionTypeChange: (type: TransactionType) => void
  onAmountChange: (value: string) => void
  onLoadOfficialRate: () => void
  onSubmit: () => void
  onReset: () => void
}

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const inputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

export function ExchangeForm({
  currencyCode,
  baseRate,
  spreadRate,
  preferentialRate,
  transactionType,
  amount,
  errorMessage,
  isLoadingOfficialRate,
  officialRateMetadata,
  officialRateErrorMessage,
  officialRateWarningMessage,
  onCurrencyChange,
  onBaseRateChange,
  onSpreadRateChange,
  onPreferentialRateChange,
  onTransactionTypeChange,
  onAmountChange,
  onLoadOfficialRate,
  onSubmit,
  onReset,
}: ExchangeFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="currencyCode" className={labelClassName}>
            통화
          </label>
          <select
            id="currencyCode"
            className={inputClassName}
            value={currencyCode}
            onChange={(event) =>
              onCurrencyChange(event.target.value as CurrencyCode)
            }
          >
            {SUPPORTED_CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {CURRENCIES[code].displayName} ({code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={labelClassName}>거래구분</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTransactionTypeChange('buy')}
              aria-pressed={transactionType === 'buy'}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                transactionType === 'buy'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              매입(살 때)
            </button>
            <button
              type="button"
              onClick={() => onTransactionTypeChange('sell')}
              aria-pressed={transactionType === 'sell'}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                transactionType === 'sell'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              매도(팔 때)
            </button>
          </div>
        </div>

        <OfficialRateField
          inputId="baseRate"
          label="기준환율"
          currencyCode={currencyCode}
          baseRate={baseRate}
          isLoadingOfficialRate={isLoadingOfficialRate}
          officialRateMetadata={officialRateMetadata}
          officialRateErrorMessage={officialRateErrorMessage}
          officialRateWarningMessage={officialRateWarningMessage}
          onBaseRateChange={onBaseRateChange}
          onLoadOfficialRate={onLoadOfficialRate}
        />

        <div>
          <label htmlFor="amount" className={labelClassName}>
            외화금액
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="예: 500"
            className={inputClassName}
            value={amount}
            onChange={(event) =>
              onAmountChange(formatNumericInput(event.target.value))
            }
          />
        </div>

        <div>
          <label htmlFor="spreadRate" className={labelClassName}>
            스프레드율(%)
          </label>
          <input
            id="spreadRate"
            type="text"
            inputMode="decimal"
            placeholder="예: 1.75"
            className={inputClassName}
            value={spreadRate}
            onChange={(event) => onSpreadRateChange(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="preferentialRate" className={labelClassName}>
            우대율(%)
          </label>
          <input
            id="preferentialRate"
            type="text"
            inputMode="decimal"
            placeholder="예: 80"
            className={inputClassName}
            value={preferentialRate}
            onChange={(event) => onPreferentialRateChange(event.target.value)}
          />
        </div>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          계산
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 sm:w-auto"
        >
          초기화
        </button>
      </div>
    </form>
  )
}
