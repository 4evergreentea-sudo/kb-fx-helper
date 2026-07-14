import type { CurrencyCode } from '../../src/shared/model/index.js'

/** 한국수출입은행 API 원시 행 (api/lib 전용) */
export interface EximRateRow {
  result?: number
  cur_unit?: string
  deal_bas_r?: string
}

export interface ParseEximRatesResult {
  rates: Partial<Record<CurrencyCode, number>>
}

const DIRECT_MAPPINGS: Record<string, CurrencyCode> = {
  USD: 'USD',
  EUR: 'EUR',
  CNY: 'CNY',
  CNH: 'CNY',
  'JPY(100)': 'JPY',
}

/**
 * Exim 원시 응답을 앱 통화 코드 기준 rates로 변환한다.
 * JPY, JPY(1) 등 JPY(100) 이외의 엔 표기는 제외한다.
 */
export function parseEximRates(rows: EximRateRow[]): ParseEximRatesResult {
  const rates: Partial<Record<CurrencyCode, number>> = {}

  for (const row of rows) {
    if (row.result !== 1) {
      continue
    }

    const curUnit = row.cur_unit?.trim()

    if (!curUnit) {
      continue
    }

    const currencyCode = DIRECT_MAPPINGS[curUnit]

    if (!currencyCode) {
      continue
    }

    const parsedRate = parseDealBasRate(row.deal_bas_r)

    if (parsedRate === null) {
      continue
    }

    rates[currencyCode] = parsedRate
  }

  return { rates }
}

/** 파싱 결과에 최소 1개 이상의 지원 통화가 있는지 확인한다 */
export function hasSupportedRates(
  rates: Partial<Record<CurrencyCode, number>>,
): boolean {
  return Object.keys(rates).length > 0
}

function parseDealBasRate(value: string | undefined): number | null {
  if (!value) {
    return null
  }

  const normalized = value.replaceAll(',', '').trim()
  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}
