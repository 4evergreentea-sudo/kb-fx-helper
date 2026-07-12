/** validation 함수들의 반환 타입. UI가 boolean과 에러 메시지를 함께 다룰 수 있도록 설계 */
export interface ValidationResult {
  valid: boolean
  message?: string
}
