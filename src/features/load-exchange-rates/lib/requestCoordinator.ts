/** 공식 환율 요청의 최신성을 추적한다 */
export interface RequestCoordinator {
  start(): number
  invalidate(): void
  isCurrent(requestId: number): boolean
  getLatestRequestId(): number
}

export function createRequestCoordinator(): RequestCoordinator {
  let latestRequestId = 0

  return {
    start(): number {
      latestRequestId += 1
      return latestRequestId
    },
    invalidate(): void {
      latestRequestId += 1
    },
    isCurrent(requestId: number): boolean {
      return requestId === latestRequestId
    },
    getLatestRequestId(): number {
      return latestRequestId
    },
  }
}
