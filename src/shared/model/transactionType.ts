/** 거래구분. entities 간 순환 의존을 막기 위해 shared/model에 둔 공용 원시 타입 */
export type TransactionType = 'buy' | 'sell'
