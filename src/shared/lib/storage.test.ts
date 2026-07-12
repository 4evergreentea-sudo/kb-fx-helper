import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readJSON, writeJSON } from './storage'

/**
 * 테스트는 node 환경에서 실행되므로(jsdom 미사용) localStorage를 직접 사용할 수 없다.
 * 실제 Storage와 동일한 동작(getItem/setItem/removeItem/clear)을 하는 최소 구현을 주입한다.
 */
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

describe('storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  describe('readJSON', () => {
    it('저장된 값을 파싱해 반환한다', () => {
      localStorage.setItem('key', JSON.stringify({ a: 1 }))
      expect(readJSON('key', null)).toEqual({ a: 1 })
    })

    it('값이 없으면 fallback을 반환한다', () => {
      expect(readJSON('missing', 'fallback')).toBe('fallback')
    })

    it('JSON이 손상되었으면 fallback을 반환한다', () => {
      localStorage.setItem('key', '{broken-json')
      expect(readJSON('key', [] as unknown[])).toEqual([])
    })

    it('localStorage를 사용할 수 없으면 fallback을 반환한다', () => {
      Reflect.deleteProperty(globalThis, 'localStorage')
      expect(readJSON('key', 'fallback')).toBe('fallback')
    })
  })

  describe('writeJSON', () => {
    it('값을 저장하고 true를 반환한다', () => {
      expect(writeJSON('key', { a: 1 })).toBe(true)
      expect(localStorage.getItem('key')).toBe(JSON.stringify({ a: 1 }))
    })

    it('저장에 실패하면 예외 없이 false를 반환한다', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          ...createMemoryStorage(),
          setItem: () => {
            throw new Error('QuotaExceededError')
          },
        },
        configurable: true,
      })

      expect(writeJSON('key', { a: 1 })).toBe(false)
    })

    it('localStorage를 사용할 수 없으면 false를 반환한다', () => {
      Reflect.deleteProperty(globalThis, 'localStorage')
      expect(writeJSON('key', { a: 1 })).toBe(false)
    })
  })
})
