import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const OPERATIONAL_API_FILES = [
  'api/exchange-rates.ts',
  'api/lib/fetchEximRates.ts',
  'api/lib/parseEximRates.ts',
]

function extractImportSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
}

describe('api operational import specifiers', () => {
  for (const file of OPERATIONAL_API_FILES) {
    it(`${file} uses .js import specifiers only`, () => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      const tsSpecifiers = extractImportSpecifiers(source).filter((specifier) =>
        specifier.endsWith('.ts'),
      )

      expect(tsSpecifiers).toEqual([])
    })
  }

  it('fetchEximRates.ts does not runtime-import src/shared modules', () => {
    const source = readFileSync(
      join(process.cwd(), 'api/lib/fetchEximRates.ts'),
      'utf8',
    )

    expect(source).not.toMatch(
      /^import\s+(?!type\b)[^;]*from\s+['"]\.\.\/\.\.\/src\//m,
    )
    expect(source).toContain("const OFFICIAL_EXCHANGE_RATES_SOURCE = '한국수출입은행'")
  })
})
