import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EXCHANGE_RATES_CACHE_KEY,
  isCacheValid,
  readExchangeRatesCache,
  saveExchangeRatesCache,
} from './exchangeRatesCache'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('exchangeRatesCache', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T12:00:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('write/read round-trip을 수행한다', () => {
    const snapshot = {
      baseDate: '2026-07-12',
      fetchedAt: '2026-07-13T03:00:00.000Z',
      source: '한국수출입은행',
      rates: { USD: 1384.5 },
    }

    expect(saveExchangeRatesCache(snapshot)).toBe(true)
    expect(readExchangeRatesCache()).toEqual(snapshot)
  })

  it('fetchedAt이 7일 이내면 유효하다', () => {
    const fetchedAt = new Date('2026-07-07T12:00:00+09:00').toISOString()
    expect(isCacheValid(fetchedAt)).toBe(true)
  })

  it('fetchedAt이 7일 초과면 유효하지 않다', () => {
    const fetchedAt = new Date('2026-07-05T11:59:59+09:00').toISOString()
    expect(isCacheValid(fetchedAt)).toBe(false)
  })

  it('localStorage에 잘못된 값이 있으면 null을 반환한다', () => {
    localStorage.setItem(EXCHANGE_RATES_CACHE_KEY, '{"invalid":true}')
    expect(readExchangeRatesCache()).toBeNull()
  })
})
