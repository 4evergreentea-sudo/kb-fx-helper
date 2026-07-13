import type { FormEvent } from 'react'
import { CURRENCIES, SUPPORTED_CURRENCY_CODES } from '../../entities/currency'
import type { CurrencyCode } from '../../entities/currency'
import { formatNumericInput } from '../../shared/lib'

interface RemittanceFormProps {
  currencyCode: CurrencyCode
  foreignAmount: string
  baseRate: string
  spreadRate: string
  preferentialRate: string
  remittanceFee: string
  cableFee: string
  errorMessage?: string
  onCurrencyChange: (code: CurrencyCode) => void
  onForeignAmountChange: (value: string) => void
  onBaseRateChange: (value: string) => void
  onSpreadRateChange: (value: string) => void
  onPreferentialRateChange: (value: string) => void
  onRemittanceFeeChange: (value: string) => void
  onCableFeeChange: (value: string) => void
  onSubmit: () => void
  onReset: () => void
}

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const inputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

export function RemittanceForm({
  currencyCode,
  foreignAmount,
  baseRate,
  spreadRate,
  preferentialRate,
  remittanceFee,
  cableFee,
  errorMessage,
  onCurrencyChange,
  onForeignAmountChange,
  onBaseRateChange,
  onSpreadRateChange,
  onPreferentialRateChange,
  onRemittanceFeeChange,
  onCableFeeChange,
  onSubmit,
  onReset,
}: RemittanceFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="remittanceCurrencyCode" className={labelClassName}>
            송금 통화
          </label>
          <select
            id="remittanceCurrencyCode"
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
          <label htmlFor="foreignAmount" className={labelClassName}>
            외화 송금액
          </label>
          <input
            id="foreignAmount"
            type="text"
            inputMode="decimal"
            placeholder="예: 1,000"
            className={inputClassName}
            value={foreignAmount}
            onChange={(event) =>
              onForeignAmountChange(formatNumericInput(event.target.value))
            }
          />
        </div>

        <div>
          <label htmlFor="remittanceBaseRate" className={labelClassName}>
            전신환 매매기준율
          </label>
          <input
            id="remittanceBaseRate"
            type="text"
            inputMode="decimal"
            placeholder="예: 1,340.50"
            className={inputClassName}
            value={baseRate}
            onChange={(event) =>
              onBaseRateChange(formatNumericInput(event.target.value))
            }
          />
        </div>

        <div>
          <label htmlFor="remittanceSpreadRate" className={labelClassName}>
            스프레드율(%)
          </label>
          <input
            id="remittanceSpreadRate"
            type="text"
            inputMode="decimal"
            placeholder="예: 1.75"
            className={inputClassName}
            value={spreadRate}
            onChange={(event) => onSpreadRateChange(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="remittancePreferentialRate"
            className={labelClassName}
          >
            우대율(%)
          </label>
          <input
            id="remittancePreferentialRate"
            type="text"
            inputMode="decimal"
            placeholder="예: 80"
            className={inputClassName}
            value={preferentialRate}
            onChange={(event) => onPreferentialRateChange(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="remittanceFee" className={labelClassName}>
            송금수수료
          </label>
          <input
            id="remittanceFee"
            type="text"
            inputMode="decimal"
            placeholder="예: 5,000"
            className={inputClassName}
            value={remittanceFee}
            onChange={(event) =>
              onRemittanceFeeChange(formatNumericInput(event.target.value))
            }
          />
        </div>

        <div>
          <label htmlFor="cableFee" className={labelClassName}>
            전신료
          </label>
          <input
            id="cableFee"
            type="text"
            inputMode="decimal"
            placeholder="예: 8,000"
            className={inputClassName}
            value={cableFee}
            onChange={(event) =>
              onCableFeeChange(formatNumericInput(event.target.value))
            }
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
