/** 지원 통화 코드. entities 간 순환 의존을 막기 위해 shared/model에 둔 공용 원시 타입 */
export type CurrencyCode = 'USD' | 'EUR' | 'JPY' | 'CNY'

/** 지원하는 통화 코드 목록. entities/currency의 통화 카탈로그와 검증 로직이 공유한다 */
export const SUPPORTED_CURRENCY_CODES: readonly CurrencyCode[] = ['USD', 'EUR', 'JPY', 'CNY']
