import { formatKRW, formatRate } from '../../shared/lib'

interface RemittanceResultProps {
  /** 전신환 적용환율. 계산 전이거나 검증 실패 시 null */
  appliedRate: number | null
  /** 송금 원금(원화). 계산 전이거나 검증 실패 시 null */
  principalKRW: number | null
  /** 송금수수료. 계산 전이거나 검증 실패 시 null */
  remittanceFee: number | null
  /** 전신료. 계산 전이거나 검증 실패 시 null */
  cableFee: number | null
  /** 총 출금액(원화). 계산 전이거나 검증 실패 시 null */
  totalWithdrawalKRW: number | null
}

export function RemittanceResult({
  appliedRate,
  principalKRW,
  remittanceFee,
  cableFee,
  totalWithdrawalKRW,
}: RemittanceResultProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        송금 결과
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
            송금 원금
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {principalKRW !== null ? formatKRW(principalKRW) : '-'}
          </dd>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            송금수수료
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {remittanceFee !== null ? formatKRW(remittanceFee) : '-'}
          </dd>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            전신료
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {cableFee !== null ? formatKRW(cableFee) : '-'}
          </dd>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950 sm:col-span-2">
          <dt className="text-sm font-medium text-blue-700 dark:text-blue-300">
            총 출금액
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-blue-700 dark:text-blue-400">
            {totalWithdrawalKRW !== null ? formatKRW(totalWithdrawalKRW) : '-'}
          </dd>
        </div>
      </div>
    </div>
  )
}
