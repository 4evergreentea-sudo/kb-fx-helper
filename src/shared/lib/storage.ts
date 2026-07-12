/** 브라우저 환경이 아니거나 localStorage를 사용할 수 없으면 null을 반환한다 */
function getLocalStorage(): Storage | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage
}

/**
 * localStorage에서 key에 해당하는 값을 읽어 JSON으로 파싱한다.
 * localStorage 사용 불가, JSON 파싱 실패 등 어떤 이유로든 읽기에 실패하면 fallback을 반환한다.
 * 파싱된 값의 형태(모양)는 검증하지 않는다 - 도메인별 검증은 호출하는 쪽의 책임이다.
 */
export function readJSON<T>(key: string, fallback: T): T {
  const storage = getLocalStorage()

  if (!storage) {
    return fallback
  }

  try {
    const raw = storage.getItem(key)

    if (raw === null) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * value를 JSON으로 직렬화해 localStorage에 저장한다.
 * localStorage 사용 불가, 저장 용량 초과, 비공개 모드 등으로 저장에 실패하면
 * 예외를 던지지 않고 false를 반환한다.
 */
export function writeJSON<T>(key: string, value: T): boolean {
  const storage = getLocalStorage()

  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
