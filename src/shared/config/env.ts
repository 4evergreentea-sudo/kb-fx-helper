function readEnv(key: string): string | undefined {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Supabase 프로젝트 URL. 미설정 시 undefined */
export function getSupabaseUrl(): string | undefined {
  return readEnv('VITE_SUPABASE_URL')
}

/**
 * 브라우저에 노출해도 되는 Supabase 공개 키.
 * 신규 명칭(`VITE_SUPABASE_PUBLISHABLE_KEY`)을 우선 사용하고,
 * 프로젝트에 legacy anon key만 발급된 경우에만 `VITE_SUPABASE_ANON_KEY`로 fallback한다.
 * service_role/secret key는 이 모듈에서 다루지 않는다(브라우저에 절대 포함하지 않음).
 */
export function getSupabasePublishableKey(): string | undefined {
  return readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ?? readEnv('VITE_SUPABASE_ANON_KEY')
}

/** URL과 공개 키가 모두 설정되어야 Supabase 연동이 활성화된다 */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey())
}
