import { ExchangePanel } from '../../widgets/exchange-panel'
import { RemittancePanel } from '../../widgets/remittance-panel'
import { TransactionHistoryPanel } from '../../widgets/transaction-history-panel'

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            KB 외환 도우미
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
            환전 계산 및 거래 관리
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            환율을 입력하고 환전 금액을 빠르게 계산해보세요.
          </p>
        </header>

        <ExchangePanel />
        <RemittancePanel />
        <TransactionHistoryPanel />
      </div>
    </div>
  )
}
