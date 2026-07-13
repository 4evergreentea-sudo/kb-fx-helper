import type { CurrencyCode } from '../../../shared/model'
import { formatNumericInput } from '../../../shared/lib'
import type { LoadExchangeRatesMetadata } from '../model/types'

interface OfficialRateFieldProps {
  inputId: string
  label: string
  currencyCode: CurrencyCode
  baseRate: string
  isLoadingOfficialRate: boolean
  officialRateMetadata: LoadExchangeRatesMetadata | null
  officialRateErrorMessage: string | null
  officialRateWarningMessage: string | null
  onBaseRateChange: (value: string) => void
  onLoadOfficialRate: () => void
}

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const inputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

export function OfficialRateField({
  inputId,
  label,
  currencyCode,
  baseRate,
  isLoadingOfficialRate,
  officialRateMetadata,
  officialRateErrorMessage,
  officialRateWarningMessage,
  onBaseRateChange,
  onLoadOfficialRate,
}: OfficialRateFieldProps) {
  const displayLabel =
    currencyCode === 'JPY' ? `${label} (100엔 기준)` : label

  return (
    <div className="sm:col-span-2 space-y-4">
      <div>
        <label htmlFor={inputId} className={labelClassName}>
          {displayLabel}
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            placeholder="예: 1,340.50"
            className={inputClassName}
            value={baseRate}
            onChange={(event) =>
              onBaseRateChange(formatNumericInput(event.target.value))
            }
          />
          <button
            type="button"
            onClick={onLoadOfficialRate}
            disabled={isLoadingOfficialRate}
            className="w-full rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-950 sm:w-auto sm:shrink-0"
          >
            {isLoadingOfficialRate ? '불러오는 중...' : '공식 환율 불러오기'}
          </button>
        </div>
      </div>

      {officialRateMetadata && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          조회 기준일: {officialRateMetadata.baseDate} | 출처:{' '}
          {officialRateMetadata.source}
        </p>
      )}

      {officialRateWarningMessage && (
        <p
          role="status"
          className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          {officialRateWarningMessage}
        </p>
      )}

      {officialRateErrorMessage && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
        >
          {officialRateErrorMessage}
        </p>
      )}
    </div>
  )
}
