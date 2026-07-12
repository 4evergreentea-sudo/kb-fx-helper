import { useState } from 'react'
import type { FormEvent } from 'react'
import { CURRENCIES, SUPPORTED_CURRENCY_CODES } from '../../entities/currency'
import type { CurrencyCode } from '../../entities/currency'
import { useTransactionHistory } from '../../features/add-transaction'
import { formatNumericInput, parseFormattedNumber } from '../../shared/lib'

interface ConsultationSaveMessage {
  type: 'success' | 'error'
  text: string
}

const DEFAULT_CURRENCY_CODE: CurrencyCode = 'USD'

const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300'

const inputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

/**
 * 상담 기록을 직접 입력해 저장하는 영역. 계산 과정이 없어 자체적으로 상태를 갖고
 * features/add-transaction의 addConsultationRecord만 호출한다(localStorage/Supabase 직접 접근 금지).
 * 고객명·통화·외화금액(0보다 큼)·메모(상담 기록은 필수)를 모두 입력해야 저장할 수 있다.
 */
export function ConsultationRecordForm() {
  const { addConsultationRecord } = useTransactionHistory()

  const [customerName, setCustomerName] = useState('')
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY_CODE)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [saveMessage, setSaveMessage] = useState<ConsultationSaveMessage | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAmount = parseFormattedNumber(amount)

    if (parsedAmount === null) {
      setSaveMessage({ type: 'error', text: '외화금액을 올바르게 입력해주세요.' })
      return
    }

    const outcome = addConsultationRecord({
      customerName,
      currencyCode,
      amount: parsedAmount,
      memo,
    })

    if (!outcome.success) {
      setSaveMessage({
        type: 'error',
        text: outcome.message ?? '상담 기록을 저장하지 못했습니다.',
      })
      return
    }

    setSaveMessage({ type: 'success', text: '상담 기록이 저장되었습니다.' })
    setCustomerName('')
    setCurrencyCode(DEFAULT_CURRENCY_CODE)
    setAmount('')
    setMemo('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-700"
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        상담 기록 추가
      </h3>

      <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
        실제 고객정보는 입력하지 마세요. 테스트용 이름 또는 가명만 사용해주세요.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="consultationCustomerName" className={labelClassName}>
            고객명 <span className="text-red-600">*</span>
          </label>
          <input
            id="consultationCustomerName"
            type="text"
            placeholder="예: 홍길동 (테스트용 이름/가명)"
            className={inputClassName}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="consultationCurrencyCode" className={labelClassName}>
            통화 <span className="text-red-600">*</span>
          </label>
          <select
            id="consultationCurrencyCode"
            className={inputClassName}
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value as CurrencyCode)}
          >
            {SUPPORTED_CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {CURRENCIES[code].displayName} ({code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="consultationAmount" className={labelClassName}>
            외화금액 <span className="text-red-600">*</span>
          </label>
          <input
            id="consultationAmount"
            type="text"
            inputMode="decimal"
            placeholder="예: 1,000"
            className={inputClassName}
            value={amount}
            onChange={(event) => setAmount(formatNumericInput(event.target.value))}
          />
        </div>

        <div>
          <label htmlFor="consultationMemo" className={labelClassName}>
            메모 <span className="text-red-600">*</span>
          </label>
          <input
            id="consultationMemo"
            type="text"
            placeholder="예: 환전 상담 방문, 다음 주 재방문 예정"
            className={inputClassName}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
      >
        상담 기록 저장
      </button>

      {saveMessage && (
        <p
          role="alert"
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
          }`}
        >
          {saveMessage.text}
        </p>
      )}
    </form>
  )
}
