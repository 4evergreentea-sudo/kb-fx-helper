import type { FormEvent } from 'react'

export interface RemittanceSaveMessage {
  type: 'success' | 'error'
  text: string
}

interface RemittanceSaveFormProps {
  customerName: string
  memo: string
  /** 계산이 유효한 경우에만 true. false면 저장 버튼을 비활성화한다(고객명 검증과는 별개) */
  canSave: boolean
  /** 저장 시도 후 성공/실패 안내 문구. 고객명 미입력 시 여기로 실패 메시지가 표시된다 */
  saveMessage?: RemittanceSaveMessage | null
  onCustomerNameChange: (value: string) => void
  onMemoChange: (value: string) => void
  onSave: () => void
}

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const inputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

/**
 * 계산된 해외송금 거래를 거래기록으로 저장하는 영역. 고객명(필수)/메모(선택) 입력, 저장 버튼,
 * 저장 성공/실패 메시지를 담당한다. 계산 자체(RemittanceForm/RemittanceResult)와는 분리되어 있다.
 * widgets/exchange-panel의 TransactionSaveForm과 동일한 역할을 해외송금 패널에 대해 수행한다.
 */
export function RemittanceSaveForm({
  customerName,
  memo,
  canSave,
  saveMessage,
  onCustomerNameChange,
  onMemoChange,
  onSave,
}: RemittanceSaveFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700"
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        해외송금 거래 저장
      </h3>

      <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
        실제 고객정보 입력 금지, 테스트용 이름/가명 사용
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="remittanceCustomerName" className={labelClassName}>
            고객명 <span className="text-red-600">*</span>
          </label>
          <input
            id="remittanceCustomerName"
            type="text"
            required
            placeholder="예: 홍길동 (테스트용 이름/가명)"
            className={inputClassName}
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="remittanceMemo" className={labelClassName}>
            메모 (선택)
          </label>
          <input
            id="remittanceMemo"
            type="text"
            placeholder="예: 유학 자금 송금"
            className={inputClassName}
            value={memo}
            onChange={(event) => onMemoChange(event.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSave}
        className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 sm:w-auto"
      >
        거래 저장
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
