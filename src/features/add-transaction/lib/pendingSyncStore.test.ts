import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'kb-fx-helper:pending-sync'

/** node 환경(jsdom 미사용)에서 localStorage를 대체하는 최소 메모리 구현 */
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

describe('pendingSyncStore', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('초기 상태는 두 목록 모두 비어 있다', async () => {
    const { getPendingAddIds, getPendingDeleteIds } = await import('./pendingSyncStore')

    expect(getPendingAddIds()).toEqual([])
    expect(getPendingDeleteIds()).toEqual([])
  })

  it('addPendingAdd/removePendingAdd로 추가 대기 목록을 관리한다', async () => {
    const { addPendingAdd, getPendingAddIds, removePendingAdd } = await import(
      './pendingSyncStore'
    )

    addPendingAdd('tx-1')
    expect(getPendingAddIds()).toEqual(['tx-1'])

    addPendingAdd('tx-1')
    expect(getPendingAddIds()).toEqual(['tx-1'])

    removePendingAdd('tx-1')
    expect(getPendingAddIds()).toEqual([])
  })

  it('addPendingDelete/removePendingDelete로 tombstone 목록을 관리한다', async () => {
    const { addPendingDelete, getPendingDeleteIds, removePendingDelete } = await import(
      './pendingSyncStore'
    )

    addPendingDelete('tx-1')
    expect(getPendingDeleteIds()).toEqual(['tx-1'])

    removePendingDelete('tx-1')
    expect(getPendingDeleteIds()).toEqual([])
  })

  it('추가 대기 중인 id를 tombstone에 넣으면 추가 대기 목록에서 제거된다(정규화)', async () => {
    const { addPendingAdd, addPendingDelete, getPendingAddIds, getPendingDeleteIds } =
      await import('./pendingSyncStore')

    addPendingAdd('tx-1')
    addPendingDelete('tx-1')

    expect(getPendingAddIds()).toEqual([])
    expect(getPendingDeleteIds()).toEqual(['tx-1'])
  })

  it('tombstone 상태인 id를 추가 대기로 넣으면 tombstone 목록에서 제거된다(정규화)', async () => {
    const { addPendingAdd, addPendingDelete, getPendingAddIds, getPendingDeleteIds } =
      await import('./pendingSyncStore')

    addPendingDelete('tx-1')
    addPendingAdd('tx-1')

    expect(getPendingDeleteIds()).toEqual([])
    expect(getPendingAddIds()).toEqual(['tx-1'])
  })

  it('어떤 id도 pendingAdd와 pendingDelete에 동시에 존재하지 않는다', async () => {
    const { addPendingAdd, addPendingDelete, getPendingAddIds, getPendingDeleteIds } =
      await import('./pendingSyncStore')

    addPendingAdd('tx-1')
    addPendingAdd('tx-2')
    addPendingDelete('tx-2')
    addPendingDelete('tx-3')
    addPendingAdd('tx-3')

    const addIds = new Set(getPendingAddIds())
    const deleteIds = new Set(getPendingDeleteIds())
    const intersection = [...addIds].filter((id) => deleteIds.has(id))

    expect(intersection).toEqual([])
  })

  it('상태는 localStorage에 영속되어 캐시를 초기화해도 유지된다', async () => {
    const { addPendingAdd, getPendingAddIds, resetPendingSyncCache } = await import(
      './pendingSyncStore'
    )

    addPendingAdd('tx-1')
    resetPendingSyncCache()

    expect(getPendingAddIds()).toEqual(['tx-1'])
  })

  it('손상된 localStorage 데이터는 무시하고 빈 상태로 시작한다', async () => {
    localStorage.setItem(STORAGE_KEY, '{broken-json')

    const { getPendingAddIds, getPendingDeleteIds } = await import('./pendingSyncStore')

    expect(getPendingAddIds()).toEqual([])
    expect(getPendingDeleteIds()).toEqual([])
  })
})
