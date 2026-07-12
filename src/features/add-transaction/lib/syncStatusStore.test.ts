import { afterEach, describe, expect, it, vi } from 'vitest'

const isSupabaseConfiguredMock = vi.fn(() => false)

vi.mock('../../../shared/config', () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}))

describe('syncStatusStore', () => {
  afterEach(() => {
    vi.resetModules()
    isSupabaseConfiguredMock.mockReset().mockReturnValue(false)
  })

  it('초기 상태는 isSupabaseConfigured() 결과를 반영한 idle 상태다', async () => {
    isSupabaseConfiguredMock.mockReturnValue(true)

    const { getSyncStatusSnapshot } = await import('./syncStatusStore')

    expect(getSyncStatusSnapshot()).toEqual({
      isSupabaseEnabled: true,
      isSyncing: false,
      phase: 'idle',
      syncMessage: null,
      syncError: null,
    })
  })

  it('setSyncStatus는 부분 상태를 병합하고 구독자에게 알린다', async () => {
    const { getSyncStatusSnapshot, setSyncStatus, subscribeSyncStatus } = await import(
      './syncStatusStore'
    )

    const listener = vi.fn()
    subscribeSyncStatus(listener)

    setSyncStatus({ isSyncing: true, phase: 'syncing', syncMessage: '진행 중' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getSyncStatusSnapshot()).toMatchObject({
      isSyncing: true,
      phase: 'syncing',
      syncMessage: '진행 중',
    })
  })

  it('resetSyncStatus는 초기 상태로 되돌리고 구독자에게 알린다', async () => {
    const { getSyncStatusSnapshot, resetSyncStatus, setSyncStatus, subscribeSyncStatus } =
      await import('./syncStatusStore')

    setSyncStatus({ isSyncing: true, phase: 'syncing' })

    const listener = vi.fn()
    subscribeSyncStatus(listener)
    resetSyncStatus()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getSyncStatusSnapshot().phase).toBe('idle')
    expect(getSyncStatusSnapshot().isSyncing).toBe(false)
  })

  it('구독을 해지하면 이후 알림을 받지 않는다', async () => {
    const { setSyncStatus, subscribeSyncStatus } = await import('./syncStatusStore')

    const listener = vi.fn()
    const unsubscribe = subscribeSyncStatus(listener)
    unsubscribe()

    setSyncStatus({ isSyncing: true })

    expect(listener).not.toHaveBeenCalled()
  })
})
