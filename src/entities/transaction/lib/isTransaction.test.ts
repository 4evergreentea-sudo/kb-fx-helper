import { describe, expect, it } from 'vitest'
import {
  isConsultationRecord,
  isExchangeTransaction,
  isRemittanceTransaction,
  isTransaction,
} from './isTransaction'
import type { ConsultationRecord, ExchangeTransaction, RemittanceTransaction } from '../model/types'

const validExchange: ExchangeTransaction = {
  id: 'tx-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  recordType: 'exchange',
  customerName: '테스트고객 A',
  currencyCode: 'USD',
  transactionType: 'buy',
  amount: 500,
  baseRate: 1540,
  spreadRate: 1.75,
  preferentialRate: 80,
  appliedRate: 1545.39,
  krwAmount: 772695,
  memo: '',
}

const validConsultation: ConsultationRecord = {
  id: 'tx-2',
  createdAt: '2026-01-01T00:00:00.000Z',
  recordType: 'consultation',
  customerName: '테스트고객 B',
  currencyCode: 'JPY',
  amount: 100000,
  memo: '환전 상담 방문',
}

const validRemittance: RemittanceTransaction = {
  id: 'tx-3',
  createdAt: '2026-01-01T00:00:00.000Z',
  recordType: 'remittance',
  customerName: '테스트고객 C',
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
  memo: '',
}

const RATE_FIELDS = [
  'baseRate',
  'spreadRate',
  'preferentialRate',
  'appliedRate',
] as const

describe('isExchangeTransaction', () => {
  it('정상적인 ExchangeTransaction을 true로 판별한다', () => {
    expect(isExchangeTransaction(validExchange)).toBe(true)
  })

  it('customerName/memo가 빈 문자열이어도 유효하다(필수 검증은 여기서 하지 않음)', () => {
    expect(isExchangeTransaction({ ...validExchange, customerName: '', memo: '' })).toBe(true)
  })

  it('recordType이 consultation이면 false다', () => {
    expect(isExchangeTransaction(validConsultation)).toBe(false)
  })

  it('계산 필드가 누락되면 false다', () => {
    const { krwAmount: _krwAmount, ...rest } = validExchange
    expect(isExchangeTransaction(rest)).toBe(false)
  })
})

describe('isRemittanceTransaction', () => {
  it('정상적인 RemittanceTransaction을 true로 판별한다', () => {
    expect(isRemittanceTransaction(validRemittance)).toBe(true)
  })

  it('customerName/memo가 빈 문자열이어도 유효하다(필수 검증은 여기서 하지 않음)', () => {
    expect(
      isRemittanceTransaction({ ...validRemittance, customerName: '', memo: '' }),
    ).toBe(true)
  })

  it('recordType이 exchange이면 false다', () => {
    expect(isRemittanceTransaction(validExchange)).toBe(false)
  })

  it('recordType이 consultation이면 false다', () => {
    expect(isRemittanceTransaction(validConsultation)).toBe(false)
  })

  it('송금 계산 필드(totalWithdrawalKRW 등)가 누락되면 false다', () => {
    const { totalWithdrawalKRW: _totalWithdrawalKRW, ...rest } = validRemittance
    expect(isRemittanceTransaction(rest)).toBe(false)
  })
})

describe('isConsultationRecord', () => {
  it('정상적인 ConsultationRecord를 true로 판별한다', () => {
    expect(isConsultationRecord(validConsultation)).toBe(true)
  })

  it('recordType이 exchange이면 false다', () => {
    expect(isConsultationRecord(validExchange)).toBe(false)
  })

  it('공통 필드(customerName 등)가 누락되면 false다', () => {
    const { customerName: _customerName, ...rest } = validConsultation
    expect(isConsultationRecord(rest)).toBe(false)
  })
})

describe('숫자 필드 경계값(NaN/Infinity/음수/0)', () => {
  // 이 type guard는 "형태가 숫자다(finite number)"만 검사한다. 값의 범위(0 초과 등)를
  // 강제하는 업무 검증(양수 여부 등)은 validateTransactionRecord.ts가 별도로 담당하므로,
  // 음수나 0은 여기서는 "계약상 허용"되고 NaN/Infinity만 "금지"된다.
  it.each(RATE_FIELDS)('exchange의 %s가 NaN이면 false다', (field) => {
    expect(isExchangeTransaction({ ...validExchange, [field]: Number.NaN })).toBe(false)
  })

  it('exchange의 krwAmount가 NaN이면 false다', () => {
    expect(isExchangeTransaction({ ...validExchange, krwAmount: Number.NaN })).toBe(false)
  })

  it.each(RATE_FIELDS)('exchange의 %s가 Infinity/-Infinity이면 false다', (field) => {
    expect(isExchangeTransaction({ ...validExchange, [field]: Infinity })).toBe(false)
    expect(isExchangeTransaction({ ...validExchange, [field]: -Infinity })).toBe(false)
  })

  it('exchange의 krwAmount가 Infinity/-Infinity이면 false다', () => {
    expect(isExchangeTransaction({ ...validExchange, krwAmount: Infinity })).toBe(false)
    expect(isExchangeTransaction({ ...validExchange, krwAmount: -Infinity })).toBe(false)
  })

  it.each(['baseRate', 'krwAmount'] as const)(
    'exchange의 %s가 음수여도 구조적으로는 유효하다(양수 검증은 여기서 하지 않음)',
    (field) => {
      expect(isExchangeTransaction({ ...validExchange, [field]: -1 })).toBe(true)
    },
  )

  it.each(['baseRate', 'krwAmount'] as const)(
    'exchange의 %s가 0이어도 계약상 허용된다(finite number이므로 구조 검증은 통과)',
    (field) => {
      expect(isExchangeTransaction({ ...validExchange, [field]: 0 })).toBe(true)
    },
  )

  it.each(RATE_FIELDS)('remittance의 %s가 NaN이면 false다', (field) => {
    expect(isRemittanceTransaction({ ...validRemittance, [field]: Number.NaN })).toBe(false)
  })

  it('remittance의 totalWithdrawalKRW가 NaN이면 false다', () => {
    expect(
      isRemittanceTransaction({ ...validRemittance, totalWithdrawalKRW: Number.NaN }),
    ).toBe(false)
  })

  it.each(RATE_FIELDS)('remittance의 %s가 Infinity/-Infinity이면 false다', (field) => {
    expect(isRemittanceTransaction({ ...validRemittance, [field]: Infinity })).toBe(false)
    expect(isRemittanceTransaction({ ...validRemittance, [field]: -Infinity })).toBe(false)
  })

  it('remittance의 totalWithdrawalKRW가 Infinity/-Infinity이면 false다', () => {
    expect(isRemittanceTransaction({ ...validRemittance, totalWithdrawalKRW: Infinity })).toBe(
      false,
    )
    expect(
      isRemittanceTransaction({ ...validRemittance, totalWithdrawalKRW: -Infinity }),
    ).toBe(false)
  })

  it.each(['baseRate', 'totalWithdrawalKRW'] as const)(
    'remittance의 %s가 음수여도 구조적으로는 유효하다(양수 검증은 여기서 하지 않음)',
    (field) => {
      expect(isRemittanceTransaction({ ...validRemittance, [field]: -1 })).toBe(true)
    },
  )

  it.each(['baseRate', 'totalWithdrawalKRW'] as const)(
    'remittance의 %s가 0이어도 계약상 허용된다(finite number이므로 구조 검증은 통과)',
    (field) => {
      expect(isRemittanceTransaction({ ...validRemittance, [field]: 0 })).toBe(true)
    },
  )

  it('문자열 "0"처럼 숫자가 아닌 타입은 금지된다(형태 자체가 다름)', () => {
    expect(isExchangeTransaction({ ...validExchange, krwAmount: '0' })).toBe(false)
    expect(isRemittanceTransaction({ ...validRemittance, totalWithdrawalKRW: '0' })).toBe(false)
  })
})

describe('isTransaction', () => {
  it('환전/해외송금/상담 기록 모두 true로 판별한다(거래 목록 recordType 분기 회귀 방지)', () => {
    expect(isTransaction(validExchange)).toBe(true)
    expect(isTransaction(validRemittance)).toBe(true)
    expect(isTransaction(validConsultation)).toBe(true)
  })

  it('객체가 아니거나 null이면 false다', () => {
    expect(isTransaction(null)).toBe(false)
    expect(isTransaction(undefined)).toBe(false)
    expect(isTransaction('broken')).toBe(false)
  })

  it('지원하지 않는 통화 코드는 false다', () => {
    expect(isTransaction({ ...validExchange, currencyCode: 'XXX' })).toBe(false)
  })
})
