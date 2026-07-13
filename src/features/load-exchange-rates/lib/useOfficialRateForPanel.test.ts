import { describe, expect, it, vi } from 'vitest'
import type { CurrencyCode } from '../../../shared/model'
import { useOfficialRateForPanel } from '../index'
import { createOfficialRatePanelHandlers } from './useOfficialRateForPanel'

const formatRate = (rate: number) => String(rate)

function createDeps(overrides: Partial<Parameters<typeof createOfficialRatePanelHandlers>[0]> = {}) {
  const latestCurrencyCodeRef = {
    current: 'USD' as CurrencyCode,
  }

  return {
    currencyCode: 'USD' as CurrencyCode,
    latestCurrencyCodeRef,
    loadOfficialRate: vi.fn(),
    resetOfficialRates: vi.fn(),
    setBaseRate: vi.fn(),
    clearLastInput: vi.fn(),
    clearResult: vi.fn(),
    onCurrencyChange: vi.fn(),
    formatRate,
    ...overrides,
  }
}

describe('createOfficialRatePanelHandlers', () => {
  it('최신 요청이고 통화가 일치하면 환율을 적용한다', async () => {
    const deps = createDeps({
      loadOfficialRate: vi.fn().mockResolvedValue({
        applied: true,
        requestId: 1,
        latestRequestId: 1,
        baseRate: 1384.5,
      }),
    })
    const { handleLoadOfficialRate } = createOfficialRatePanelHandlers(deps)

    await handleLoadOfficialRate()

    expect(deps.setBaseRate).toHaveBeenCalledWith('1384.5')
    expect(deps.clearLastInput).toHaveBeenCalledOnce()
    expect(deps.clearResult).toHaveBeenCalledOnce()
  })

  it('요청 중 통화 변경 시 이전 응답을 적용하지 않는다', async () => {
    const deps = createDeps({
      loadOfficialRate: vi.fn().mockImplementation(async () => {
        deps.latestCurrencyCodeRef.current = 'JPY'
        return {
          applied: true,
          requestId: 1,
          latestRequestId: 1,
          baseRate: 1384.5,
        }
      }),
    })
    const { handleLoadOfficialRate } = createOfficialRatePanelHandlers(deps)

    await handleLoadOfficialRate()

    expect(deps.setBaseRate).not.toHaveBeenCalled()
    expect(deps.clearLastInput).not.toHaveBeenCalled()
    expect(deps.clearResult).not.toHaveBeenCalled()
  })

  it('stale 응답은 baseRate와 계산 상태를 변경하지 않는다', async () => {
    const deps = createDeps({
      loadOfficialRate: vi.fn().mockResolvedValue({
        applied: false,
        requestId: 1,
        latestRequestId: 2,
        reason: 'stale',
      }),
    })
    const { handleLoadOfficialRate } = createOfficialRatePanelHandlers(deps)

    await handleLoadOfficialRate()

    expect(deps.setBaseRate).not.toHaveBeenCalled()
    expect(deps.clearLastInput).not.toHaveBeenCalled()
    expect(deps.clearResult).not.toHaveBeenCalled()
  })

  it('handleCurrencyChange 시 resetOfficialRates와 onCurrencyChange를 호출한다', () => {
    const deps = createDeps()
    const { handleCurrencyChange } = createOfficialRatePanelHandlers(deps)

    handleCurrencyChange('JPY')

    expect(deps.resetOfficialRates).toHaveBeenCalledOnce()
    expect(deps.onCurrencyChange).toHaveBeenCalledWith('JPY')
    expect(deps.latestCurrencyCodeRef.current).toBe('JPY')
  })
})

describe('useOfficialRateForPanel public API', () => {
  it('feature public API에서 공용 hook을 export한다', () => {
    expect(typeof useOfficialRateForPanel).toBe('function')
  })
})
