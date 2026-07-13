import { describe, expect, it, vi } from 'vitest'
import {
  applyOfficialRateToPanel,
  shouldApplyOfficialRateToInput,
} from './applyOfficialRateResult'

const formatRate = (rate: number) => String(rate)

function createPanelCallbacks() {
  return {
    setBaseRate: vi.fn(),
    clearLastInput: vi.fn(),
    clearResult: vi.fn(),
  }
}

describe('shouldApplyOfficialRateToInput', () => {
  it('통화가 같고 최신 요청이면 baseRate를 반영한다', () => {
    const result = shouldApplyOfficialRateToInput('USD', 'USD', {
      applied: true,
      requestId: 2,
      latestRequestId: 2,
      baseRate: 1384.5,
    })

    expect(result).toBe(true)
  })

  it('USD 조회 중 JPY로 변경되면 USD 환율을 반영하지 않는다', () => {
    const result = shouldApplyOfficialRateToInput('USD', 'JPY', {
      applied: true,
      requestId: 1,
      latestRequestId: 1,
      baseRate: 1384.5,
    })

    expect(result).toBe(false)
  })

  it('오래된 요청 결과는 반영하지 않는다', () => {
    const result = shouldApplyOfficialRateToInput('USD', 'USD', {
      applied: false,
      requestId: 1,
      latestRequestId: 2,
      reason: 'stale',
    })

    expect(result).toBe(false)
  })
})

describe('applyOfficialRateToPanel', () => {
  it('현재 통화와 요청 통화가 같고 최신 요청이면 환율을 적용한다', () => {
    const callbacks = createPanelCallbacks()

    const applied = applyOfficialRateToPanel({
      requestedCurrency: 'USD',
      currentCurrency: 'USD',
      loadResult: {
        applied: true,
        requestId: 2,
        latestRequestId: 2,
        baseRate: 1384.5,
      },
      formatRate,
      ...callbacks,
    })

    expect(applied).toBe(true)
    expect(callbacks.setBaseRate).toHaveBeenCalledWith('1384.5')
    expect(callbacks.clearLastInput).toHaveBeenCalledOnce()
    expect(callbacks.clearResult).toHaveBeenCalledOnce()
  })

  it('환율 적용 시 result와 lastInput을 초기화한다', () => {
    const callbacks = createPanelCallbacks()

    applyOfficialRateToPanel({
      requestedCurrency: 'USD',
      currentCurrency: 'USD',
      loadResult: {
        applied: true,
        requestId: 1,
        latestRequestId: 1,
        baseRate: 1400,
      },
      formatRate,
      ...callbacks,
    })

    expect(callbacks.setBaseRate).toHaveBeenCalledWith('1400')
    expect(callbacks.clearLastInput).toHaveBeenCalledOnce()
    expect(callbacks.clearResult).toHaveBeenCalledOnce()
  })

  it('요청 중 USD에서 JPY로 변경되면 USD 응답을 적용하지 않는다', () => {
    const callbacks = createPanelCallbacks()

    const applied = applyOfficialRateToPanel({
      requestedCurrency: 'USD',
      currentCurrency: 'JPY',
      loadResult: {
        applied: true,
        requestId: 1,
        latestRequestId: 1,
        baseRate: 1384.5,
      },
      formatRate,
      ...callbacks,
    })

    expect(applied).toBe(false)
    expect(callbacks.setBaseRate).not.toHaveBeenCalled()
    expect(callbacks.clearLastInput).not.toHaveBeenCalled()
    expect(callbacks.clearResult).not.toHaveBeenCalled()
  })

  it('stale 응답이면 baseRate, result, lastInput을 변경하지 않는다', () => {
    const callbacks = createPanelCallbacks()

    const applied = applyOfficialRateToPanel({
      requestedCurrency: 'USD',
      currentCurrency: 'USD',
      loadResult: {
        applied: false,
        requestId: 1,
        latestRequestId: 2,
        reason: 'stale',
      },
      formatRate,
      ...callbacks,
    })

    expect(applied).toBe(false)
    expect(callbacks.setBaseRate).not.toHaveBeenCalled()
    expect(callbacks.clearLastInput).not.toHaveBeenCalled()
    expect(callbacks.clearResult).not.toHaveBeenCalled()
  })
})
