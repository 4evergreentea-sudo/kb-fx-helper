import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from './env'

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('URL과 publishable key가 모두 있으면 설정된 것으로 판단한다', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    expect(getSupabaseUrl()).toBe('https://example.supabase.co')
    expect(getSupabasePublishableKey()).toBe('publishable-key')
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('publishable key가 없고 legacy anon key만 있으면 fallback으로 사용한다', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'legacy-anon-key')

    expect(getSupabasePublishableKey()).toBe('legacy-anon-key')
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('publishable key와 legacy anon key가 모두 있으면 publishable key를 우선한다', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'legacy-anon-key')

    expect(getSupabasePublishableKey()).toBe('publishable-key')
  })

  it('URL이 없으면 설정되지 않은 것으로 판단한다', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')

    expect(isSupabaseConfigured()).toBe(false)
  })

  it('키가 전혀 없으면 설정되지 않은 것으로 판단한다', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    expect(isSupabaseConfigured()).toBe(false)
    expect(getSupabasePublishableKey()).toBeUndefined()
  })
})
