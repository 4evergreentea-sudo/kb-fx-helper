import { describe, expect, it } from 'vitest'
import { migrateLegacyTransaction } from './migrateLegacyTransaction'

describe('migrateLegacyTransaction', () => {
  it('recordType이 없는 레거시 환전 데이터에 recordType과 빈 customerName/memo를 채운다', () => {
    const legacy = {
      id: 'tx-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      currencyCode: 'USD',
      transactionType: 'buy',
      amount: 500,
      baseRate: 1540,
      spreadRate: 1.75,
      preferentialRate: 80,
      appliedRate: 1545.39,
      krwAmount: 772695,
    }

    expect(migrateLegacyTransaction(legacy)).toEqual({
      ...legacy,
      recordType: 'exchange',
      customerName: '',
      memo: '',
    })
  })

  it('이미 신형인데 customerName/memo가 누락되면 빈 문자열로 보강한다', () => {
    const partiallyMigrated = {
      id: 'tx-2',
      createdAt: '2026-01-01T00:00:00.000Z',
      recordType: 'exchange',
      currencyCode: 'USD',
      transactionType: 'buy',
      amount: 500,
      baseRate: 1540,
      spreadRate: 1.75,
      preferentialRate: 80,
      appliedRate: 1545.39,
      krwAmount: 772695,
    }

    expect(migrateLegacyTransaction(partiallyMigrated)).toEqual({
      ...partiallyMigrated,
      customerName: '',
      memo: '',
    })
  })

  it('recordType이 remittance인데 customerName/memo가 누락되면 빈 문자열로 보강한다(신규 필드 회귀 방지)', () => {
    const partiallyMigratedRemittance = {
      id: 'tx-remit-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      recordType: 'remittance',
      currencyCode: 'USD',
      amount: 1000,
      baseRate: 1400,
      spreadRate: 1.75,
      preferentialRate: 80,
      appliedRate: 1404.9,
      principalKRW: 1404900,
      remittanceFee: 5000,
      cableFee: 8000,
      totalWithdrawalKRW: 1417900,
    }

    expect(migrateLegacyTransaction(partiallyMigratedRemittance)).toEqual({
      ...partiallyMigratedRemittance,
      customerName: '',
      memo: '',
    })
  })

  it('정상적인 신형 데이터는 customerName/memo 값을 그대로 유지한다', () => {
    const modern = {
      id: 'tx-3',
      createdAt: '2026-01-01T00:00:00.000Z',
      recordType: 'consultation',
      customerName: '테스트고객 A',
      currencyCode: 'JPY',
      amount: 100000,
      memo: '환전 상담 방문',
    }

    expect(migrateLegacyTransaction(modern)).toEqual(modern)
  })

  it('알 수 없는 모양의 값은 그대로 반환한다(이후 isTransaction이 거부)', () => {
    expect(migrateLegacyTransaction({ foo: 'bar' })).toEqual({ foo: 'bar' })
    expect(migrateLegacyTransaction('broken')).toBe('broken')
    expect(migrateLegacyTransaction(null)).toBe(null)
    expect(migrateLegacyTransaction(undefined)).toBe(undefined)
  })
})
