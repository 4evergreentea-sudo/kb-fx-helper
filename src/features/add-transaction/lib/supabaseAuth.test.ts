import { afterEach, describe, expect, it, vi } from 'vitest'

const getSupabaseClientMock = vi.fn()

vi.mock('../../../shared/api', () => ({
  getSupabaseClient: getSupabaseClientMock,
}))

describe('supabaseAuth.ensureAnonymousSession', () => {
  afterEach(() => {
    vi.resetModules()
    getSupabaseClientMock.mockReset()
  })

  it('Supabase가 설정되지 않으면 null을 반환한다', async () => {
    getSupabaseClientMock.mockReturnValue(null)

    const { ensureAnonymousSession } = await import('./supabaseAuth')

    await expect(ensureAnonymousSession()).resolves.toBeNull()
  })

  it('기존 세션이 있으면 재사용하고 signInAnonymously를 호출하지 않는다', async () => {
    const signInAnonymously = vi.fn()
    getSupabaseClientMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'existing-user' } } },
        }),
        signInAnonymously,
      },
    })

    const { ensureAnonymousSession } = await import('./supabaseAuth')

    await expect(ensureAnonymousSession()).resolves.toBe('existing-user')
    expect(signInAnonymously).not.toHaveBeenCalled()
  })

  it('세션이 없으면 signInAnonymously로 익명 로그인해 user_id를 반환한다', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-anon-user' } },
      error: null,
    })
    getSupabaseClientMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInAnonymously,
      },
    })

    const { ensureAnonymousSession } = await import('./supabaseAuth')

    await expect(ensureAnonymousSession()).resolves.toBe('new-anon-user')
    expect(signInAnonymously).toHaveBeenCalledTimes(1)
  })

  it('동시에 여러 번 호출해도 signInAnonymously는 1회만 호출된다', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: { id: 'anon-user' } },
      error: null,
    })
    getSupabaseClientMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInAnonymously,
      },
    })

    const { ensureAnonymousSession } = await import('./supabaseAuth')

    const [first, second] = await Promise.all([
      ensureAnonymousSession(),
      ensureAnonymousSession(),
    ])

    expect(first).toBe('anon-user')
    expect(second).toBe('anon-user')
    expect(signInAnonymously).toHaveBeenCalledTimes(1)
  })

  it('익명 로그인이 실패하면 null을 반환한다', async () => {
    getSupabaseClientMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInAnonymously: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('로그인 실패'),
        }),
      },
    })

    const { ensureAnonymousSession } = await import('./supabaseAuth')

    await expect(ensureAnonymousSession()).resolves.toBeNull()
  })

  it('세션 조회 중 예외가 발생해도 예외를 던지지 않고 null을 반환한다', async () => {
    getSupabaseClientMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockRejectedValue(new Error('네트워크 오류')),
        signInAnonymously: vi.fn(),
      },
    })

    const { ensureAnonymousSession } = await import('./supabaseAuth')

    await expect(ensureAnonymousSession()).resolves.toBeNull()
  })
})
