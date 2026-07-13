import type { ExchangeRatesCacheSnapshot } from '../../../shared/model'
import { readJSON, writeJSON } from '../../../shared/lib'

export const EXCHANGE_RATES_CACHE_KEY = 'kb-fx-helper:official-exchange-rates'
export const CACHE_VALIDITY_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function saveExchangeRatesCache(
  snapshot: ExchangeRatesCacheSnapshot,
): boolean {
  return writeJSON(EXCHANGE_RATES_CACHE_KEY, snapshot)
}

export function readExchangeRatesCache(): ExchangeRatesCacheSnapshot | null {
  const snapshot = readJSON<ExchangeRatesCacheSnapshot | null>(
    EXCHANGE_RATES_CACHE_KEY,
    null,
  )

  if (!snapshot) {
    return null
  }

  if (!isValidCacheSnapshot(snapshot)) {
    return null
  }

  return snapshot
}

export function isCacheValid(
  fetchedAt: string,
  referenceDate: Date = new Date(),
): boolean {
  const fetchedAtMs = Date.parse(fetchedAt)

  if (Number.isNaN(fetchedAtMs)) {
    return false
  }

  const ageMs = referenceDate.getTime() - fetchedAtMs
  return ageMs >= 0 && ageMs <= CACHE_VALIDITY_DAYS * MS_PER_DAY
}

function isValidCacheSnapshot(
  snapshot: ExchangeRatesCacheSnapshot,
): snapshot is ExchangeRatesCacheSnapshot {
  return (
    typeof snapshot.baseDate === 'string' &&
    typeof snapshot.fetchedAt === 'string' &&
    typeof snapshot.source === 'string' &&
    typeof snapshot.rates === 'object' &&
    snapshot.rates !== null
  )
}
