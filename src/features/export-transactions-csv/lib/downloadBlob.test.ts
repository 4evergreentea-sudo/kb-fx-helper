import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from './downloadBlob'

describe('downloadBlob', () => {
  const blob = new Blob(['test'], { type: 'text/csv' })

  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let click: ReturnType<typeof vi.fn>
  let appendChild: ReturnType<typeof vi.fn>
  let removeChild: ReturnType<typeof vi.fn>
  let createElement: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURL = vi.fn()
    click = vi.fn()
    appendChild = vi.fn()
    removeChild = vi.fn()
    createElement = vi.fn().mockReturnValue({ href: '', download: '', click })

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('document', {
      createElement,
      body: { appendChild, removeChild },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('objectURL을 만들고 앵커의 href/download를 설정한 뒤 클릭한다', () => {
    downloadBlob(blob, 'sample.csv')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(createElement).toHaveBeenCalledWith('a')
    const anchor = createElement.mock.results[0]?.value
    expect(anchor.href).toBe('blob:mock-url')
    expect(anchor.download).toBe('sample.csv')
    expect(appendChild).toHaveBeenCalledWith(anchor)
    expect(click).toHaveBeenCalledTimes(1)
    expect(removeChild).toHaveBeenCalledWith(anchor)
  })

  it('다운로드가 끝나면 생성된 url로 revokeObjectURL을 호출한다', () => {
    downloadBlob(blob, 'sample.csv')

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('앵커 조작 중 예외가 발생해도 revokeObjectURL이 반드시 호출된다', () => {
    click.mockImplementation(() => {
      throw new Error('click failed')
    })

    expect(() => downloadBlob(blob, 'sample.csv')).toThrow('click failed')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
