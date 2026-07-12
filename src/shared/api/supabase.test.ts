import { afterEach, describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn(() => ({ mocked: 'client' }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

describe('getSupabaseClient', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    createClientMock.mockClear()
  })

  it('환경변수가 없으면 client를 생성하지 않고 null을 반환한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    const { getSupabaseClient } = await import('./supabase')

    expect(getSupabaseClient()).toBeNull()
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('환경변수가 있으면 client를 생성하고, 이후 호출에는 캐시된 인스턴스를 재사용한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')

    const { getSupabaseClient } = await import('./supabase')

    const first = getSupabaseClient()
    const second = getSupabaseClient()

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'publishable-key')
    expect(first).toBe(second)
  })
})
