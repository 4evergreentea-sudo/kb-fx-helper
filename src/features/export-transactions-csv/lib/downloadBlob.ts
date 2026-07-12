/**
 * Blob을 지정한 파일명으로 다운로드한다.
 * 숨긴 앵커를 만들어 클릭한 뒤 제거하며, 도중에 예외가 발생해도
 * object URL이 반드시 해제되도록 try/finally로 감싼다.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    URL.revokeObjectURL(url)
  }
}
