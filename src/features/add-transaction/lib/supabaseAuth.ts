import { getSupabaseClient } from '../../../shared/api'

let sessionPromise: Promise<string | null> | null = null

/**
 * 기존 Supabase 세션이 있으면 재사용하고, 없으면 익명 로그인을 시도해 user_id(uuid)를 반환한다.
 * 여러 곳에서 동시에 호출해도 로그인 요청은 1회만 발생한다(in-flight promise 캐시).
 * Supabase가 설정되지 않았거나 인증에 실패하면 null을 반환하며,
 * 이 경우 호출하는 쪽(transactionStore)이 localStorage만 사용하도록 fallback해야 한다.
 */
export function ensureAnonymousSession(): Promise<string | null> {
  const client = getSupabaseClient()

  if (!client) {
    return Promise.resolve(null)
  }

  if (!sessionPromise) {
    sessionPromise = resolveAnonymousSession(client).catch((error: unknown) => {
      console.error('Supabase 익명 로그인 처리 실패', error)
      return null
    })
  }

  return sessionPromise
}

/** 테스트 전용: 캐시된 세션 promise를 초기화해 다음 호출 시 다시 인증을 시도하게 한다 */
export function resetAnonymousSessionCache(): void {
  sessionPromise = null
}

async function resolveAnonymousSession(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
): Promise<string | null> {
  const { data: sessionData } = await client.auth.getSession()
  const existingUserId = sessionData.session?.user.id

  if (existingUserId) {
    return existingUserId
  }

  const { data: signInData, error } = await client.auth.signInAnonymously()

  if (error || !signInData.user) {
    console.error('익명 로그인 실패', error)
    return null
  }

  return signInData.user.id
}
