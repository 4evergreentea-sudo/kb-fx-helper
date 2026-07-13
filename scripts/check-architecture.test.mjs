import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT_PATH = fileURLToPath(new URL('./check-architecture.mjs', import.meta.url))

let tempDirs = []

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
  tempDirs = []
})

/** files: { 'src/entities/foo/index.ts': '...', ... } */
function writeFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'arch-check-'))
  tempDirs.push(root)

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(root, relPath)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, 'utf8')
  }

  return root
}

function runArchCheck(root) {
  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    env: { ...process.env, ARCH_CHECK_ROOT: root },
    encoding: 'utf8',
  })

  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

describe('check-architecture', () => {
  it('주석과 문자열 리터럴 속 import 문구는 실제 import로 오인하지 않는다', () => {
    const root = writeFixture({
      'src/entities/currency/index.ts': `export { getCurrency } from './lib/getCurrency'\n`,
      'src/entities/currency/lib/getCurrency.ts': `
// import { useTransactionHistory } from '../../../features/add-transaction'
/* export * from '../../../features/add-transaction' */
const note = "import { useTransactionHistory } from '../../../features/add-transaction'"
const template = \`import Foo from '../../../features/add-transaction'\`

export function getCurrency() {
  return note + template
}
`,
      'src/features/add-transaction/index.ts': `export { useTransactionHistory } from './lib/useTransactionHistory'\n`,
      'src/features/add-transaction/lib/useTransactionHistory.ts': `export function useTransactionHistory() {}\n`,
    })

    const { exitCode, stdout, stderr } = runArchCheck(root)

    expect(stderr).toBe('')
    expect(stdout).toContain('✅')
    expect(exitCode).toBe(0)
  })

  it('default + named 결합 import(import Foo, { Bar } from) 양쪽 이름을 모두 인식한다', () => {
    const root = writeFixture({
      'src/features/add-transaction/index.ts': `export { onlyNamed } from './lib/onlyNamed'\n`,
      'src/features/add-transaction/lib/onlyNamed.ts': `export function onlyNamed() {}\n`,
      'src/widgets/exchange-panel/ExchangePanel.tsx': `
import MissingDefault, { onlyNamed, missingNamed } from '../../features/add-transaction'

export function ExchangePanel() {
  return MissingDefault && onlyNamed && missingNamed
}
`,
    })

    const { exitCode, stderr } = runArchCheck(root)

    expect(exitCode).toBe(1)
    // default import(MissingDefault)와 named import(missingNamed) 둘 다 존재하지 않는 이름으로 잡혀야 한다
    expect(stderr).toContain("'default'은")
    expect(stderr).toContain("'missingNamed'은")
    // 실제로 존재하는 이름(onlyNamed)은 위반으로 잡히면 안 된다
    expect(stderr).not.toContain("'onlyNamed'은")
  })

  it('하위 레이어(entities)가 상위 레이어(features)를 import하면 위반으로 탐지한다', () => {
    const root = writeFixture({
      'src/entities/currency/lib/getCurrency.ts': `
import { useTransactionHistory } from '../../../features/add-transaction'
export function getCurrency() { return useTransactionHistory }
`,
      'src/features/add-transaction/index.ts': `export { useTransactionHistory } from './lib/useTransactionHistory'\n`,
      'src/features/add-transaction/lib/useTransactionHistory.ts': `export function useTransactionHistory() {}\n`,
    })

    const { exitCode, stderr } = runArchCheck(root)

    expect(exitCode).toBe(1)
    expect(stderr).toContain('하위 레이어(entities)가 상위 레이어(features)를 import')
  })

  it('동일 레이어의 다른 슬라이스를 import하면 위반으로 탐지한다', () => {
    const root = writeFixture({
      'src/entities/currency/lib/getCurrency.ts': `
import { createExchangeTransaction } from '../../transaction'
export function getCurrency() { return createExchangeTransaction }
`,
      'src/entities/transaction/index.ts': `export { createExchangeTransaction } from './lib/createExchangeTransaction'\n`,
      'src/entities/transaction/lib/createExchangeTransaction.ts': `export function createExchangeTransaction() {}\n`,
    })

    const { exitCode, stderr } = runArchCheck(root)

    expect(exitCode).toBe(1)
    expect(stderr).toContain('동일 레이어(entities)의 다른 슬라이스(transaction)를 import')
  })

  it('슬라이스 public API(index.ts)를 거치지 않는 deep import를 위반으로 탐지한다', () => {
    const root = writeFixture({
      'src/entities/currency/lib/getCurrency.ts': `
import { formatKRW } from '../../../shared/lib/formatKRW'
export function getCurrency() { return formatKRW }
`,
      'src/shared/lib/index.ts': `export { formatKRW } from './formatKRW'\n`,
      'src/shared/lib/formatKRW.ts': `export function formatKRW() {}\n`,
    })

    const { exitCode, stderr } = runArchCheck(root)

    expect(exitCode).toBe(1)
    expect(stderr).toContain('deep import')
  })

  it('type-only import/export와 shared 세그먼트 간 참조를 포함한 정상 구조는 위반 없이 통과한다', () => {
    const root = writeFixture({
      'src/shared/model/index.ts': `export type { CurrencyCode } from './currencyCode'\n`,
      'src/shared/model/currencyCode.ts': `export type CurrencyCode = 'USD' | 'KRW'\n`,
      'src/shared/api/index.ts': `export { getClient } from './client'\n`,
      'src/shared/api/client.ts': `
import type { CurrencyCode } from '../model'

export function getClient(): CurrencyCode {
  return 'KRW'
}
`,
      'src/entities/currency/index.ts': `export type { CurrencyCode } from '../../shared/model'\n`,
    })

    const { exitCode, stdout, stderr } = runArchCheck(root)

    expect(stderr).toBe('')
    expect(stdout).toContain('✅')
    expect(exitCode).toBe(0)
  })
})
