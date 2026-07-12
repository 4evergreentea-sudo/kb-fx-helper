import { formatKRW, formatRate } from '../../shared/lib'

export interface SaveMessage {
  type: 'success' | 'error'
  text: string
}

interface ExchangeResultProps {
  /** 적용환율. 계산 전이거나 검증 실패 시 null */
  appliedRate: number | null
  /** 원화금액. 계산 전이거나 검증 실패 시 null */
  krwAmount: number | null
  /** 계산이 성공했을 때만 true. false면 저장 버튼을 비활성화한다 */
  canSave: boolean
  /** 저장 시도 후 성공/실패 안내 문구 */
  saveMessage?: SaveMessage | null
  onSave: () => void
}

export function ExchangeResult({
  appliedRate,
  krwAmount,
  canSave,
  saveMessage,
  onSave,
}: ExchangeResultProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        환산 결과
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            적용환율
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {appliedRate !== null ? formatRate(appliedRate) : '-'}
          </dd>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            원화금액
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-400">
            {krwAmount !== null ? formatKRW(krwAmount) : '-'}
          </dd>
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 sm:w-auto"
      >
        거래 저장
      </button>

      {saveMessage && (
        <p
          role="alert"
          className={`mt-2 rounded-md px-3 py-2 text-sm font-medium ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
          }`}
        >
          {saveMessage.text}
        </p>
      )}
    </div>
  )
}
