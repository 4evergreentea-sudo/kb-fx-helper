import { describe, expect, it } from 'vitest'
import {
  validateConsultationAmount,
  validateConsultationMemo,
  validateCustomerName,
  validateRemittanceAmounts,
} from './validateTransactionRecord'
import type { RemittanceAmountsToValidate } from './validateTransactionRecord'

describe('validateCustomerName', () => {
  it('빈 문자열이면 실패하고 한국어 메시지를 반환한다', () => {
    expect(validateCustomerName('')).toEqual({
      valid: false,
      message: '고객명을 입력해주세요.',
    })
  })

  it('공백만 있으면 실패한다', () => {
    expect(validateCustomerName('   ')).toEqual({
      valid: false,
      message: '고객명을 입력해주세요.',
    })
  })

  it('값이 있으면 성공한다', () => {
    expect(validateCustomerName('테스트고객 A')).toEqual({ valid: true })
  })
})

describe('validateConsultationMemo', () => {
  it('빈 문자열이면 실패하고 한국어 메시지를 반환한다', () => {
    expect(validateConsultationMemo('')).toEqual({
      valid: false,
      message: '상담 내용을 메모에 입력해주세요.',
    })
  })

  it('공백만 있으면 실패한다', () => {
    expect(validateConsultationMemo('   ')).toEqual({
      valid: false,
      message: '상담 내용을 메모에 입력해주세요.',
    })
  })

  it('값이 있으면 성공한다', () => {
    expect(validateConsultationMemo('환전 상담 방문')).toEqual({ valid: true })
  })
})

describe('validateConsultationAmount', () => {
  it('0보다 크면 성공한다', () => {
    expect(validateConsultationAmount(100000)).toEqual({ valid: true })
  })

  it('0이면 실패하고 한국어 메시지를 반환한다', () => {
    expect(validateConsultationAmount(0)).toEqual({
      valid: false,
      message: '외화금액은 0보다 커야 합니다.',
    })
  })

  it('음수이면 실패한다', () => {
    expect(validateConsultationAmount(-1).valid).toBe(false)
  })

  it('NaN이면 실패한다', () => {
    expect(validateConsultationAmount(NaN).valid).toBe(false)
  })

  it('Infinity이면 실패한다', () => {
    expect(validateConsultationAmount(Infinity).valid).toBe(false)
  })
})

describe('validateRemittanceAmounts', () => {
  const validAmounts: RemittanceAmountsToValidate = {
    amount: 1000,
    appliedRate: 1404.9,
    principalKRW: 1404900,
    remittanceFee: 5000,
    cableFee: 8000,
    totalWithdrawalKRW: 1417900,
  }

  it('모든 값이 유효하면 성공한다', () => {
    expect(validateRemittanceAmounts(validAmounts)).toEqual({ valid: true })
  })

  it('외화 송금액이 0이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, amount: 0 })).toEqual({
      valid: false,
      message: '외화 송금액은 0보다 커야 합니다.',
    })
  })

  it('외화 송금액이 음수이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, amount: -1 }).valid).toBe(false)
  })

  it('적용환율이 0이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, appliedRate: 0 })).toEqual({
      valid: false,
      message: '적용환율은 0보다 커야 합니다.',
    })
  })

  it('송금원금이 음수이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, principalKRW: -1 })).toEqual({
      valid: false,
      message: '송금원금은 0 이상이어야 합니다.',
    })
  })

  it('송금원금이 0이면 성공한다(경계값)', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, principalKRW: 0 }).valid).toBe(true)
  })

  it('송금수수료가 음수이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, remittanceFee: -1 })).toEqual({
      valid: false,
      message: '송금수수료는 0 이상이어야 합니다.',
    })
  })

  it('전신료가 음수이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, cableFee: -1 })).toEqual({
      valid: false,
      message: '전신료는 0 이상이어야 합니다.',
    })
  })

  it('총 출금액이 음수이면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, totalWithdrawalKRW: -1 })).toEqual({
      valid: false,
      message: '총 출금액은 0 이상이어야 합니다.',
    })
  })

  it('NaN/Infinity가 섞여 있으면 실패한다', () => {
    expect(validateRemittanceAmounts({ ...validAmounts, amount: NaN }).valid).toBe(false)
    expect(validateRemittanceAmounts({ ...validAmounts, appliedRate: Infinity }).valid).toBe(
      false,
    )
  })
})
