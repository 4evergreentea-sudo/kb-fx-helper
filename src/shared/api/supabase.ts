import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '../config'

let client: SupabaseClient | null = null
let initialized = false

/**
 * Supabase client 인스턴스를 생성/캐시해 반환한다.
 * 환경변수가 없으면 null을 반환하며, 이 경우 호출하는 쪽(feature 레이어)이
 * localStorage만 사용하도록 fallback해야 한다.
 *
 * 이 모듈은 client를 만드는 것 이외의 책임(인증, 테이블 조회 등)을 갖지 않는다.
 * 실제 `auth.*`, `from('transactions')` 호출은 features/add-transaction에서만 수행한다.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (initialized) {
    return client
  }

  initialized = true

  if (!isSupabaseConfigured()) {
    return null
  }

  const url = getSupabaseUrl()
  const publishableKey = getSupabasePublishableKey()

  if (!url || !publishableKey) {
    return null
  }

  client = createClient(url, publishableKey)
  return client
}
