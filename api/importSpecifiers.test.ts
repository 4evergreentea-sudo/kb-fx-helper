import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const OPERATIONAL_API_FILES = [
  'api/exchange-rates.ts',
  'api/lib/fetchEximRates.ts',
  'api/lib/parseEximRates.ts',
]

const SHARED_ROOT = resolve(process.cwd(), 'src/shared')

export type ModuleReference = {
  specifier: string
  runtime: boolean
}

export type StringConstDeclaration = {
  name: string
  value: string
}

function isStringLiteralModuleSpecifier(
  expression: ts.Expression,
): expression is ts.StringLiteral {
  return ts.isStringLiteral(expression)
}

function readStringInitializerValue(
  initializer: ts.Expression,
): string | null {
  if (ts.isStringLiteral(initializer)) {
    return initializer.text
  }

  if (ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.text
  }

  return null
}

function classifyImportDeclaration(
  node: ts.ImportDeclaration,
): ModuleReference | null {
  const moduleSpecifier = node.moduleSpecifier

  if (!isStringLiteralModuleSpecifier(moduleSpecifier)) {
    return null
  }

  const specifier = moduleSpecifier.text
  const importClause = node.importClause

  if (!importClause) {
    return { specifier, runtime: true }
  }

  if (importClause.isTypeOnly) {
    return { specifier, runtime: false }
  }

  let runtime = false

  if (importClause.name) {
    runtime = true
  }

  const namedBindings = importClause.namedBindings

  if (namedBindings) {
    if (ts.isNamespaceImport(namedBindings)) {
      runtime = true
    } else if (ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        if (!element.isTypeOnly) {
          runtime = true
          break
        }
      }
    }
  }

  return { specifier, runtime }
}

function classifyExportDeclaration(
  node: ts.ExportDeclaration,
): ModuleReference | null {
  const moduleSpecifier = node.moduleSpecifier

  if (!moduleSpecifier || !isStringLiteralModuleSpecifier(moduleSpecifier)) {
    return null
  }

  return {
    specifier: moduleSpecifier.text,
    runtime: !node.isTypeOnly,
  }
}

function classifyDynamicImport(
  node: ts.CallExpression,
): ModuleReference | null {
  if (!ts.isImportCall(node)) {
    return null
  }

  const argument = node.arguments[0]

  if (!argument || !isStringLiteralModuleSpecifier(argument)) {
    return null
  }

  return {
    specifier: argument.text,
    runtime: true,
  }
}

export function extractModuleReferences(
  source: string,
  fileName = 'fixture.ts',
): ModuleReference[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const references: ModuleReference[] = []

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const reference = classifyImportDeclaration(node)

      if (reference) {
        references.push(reference)
      }
    } else if (ts.isExportDeclaration(node)) {
      const reference = classifyExportDeclaration(node)

      if (reference) {
        references.push(reference)
      }
    } else if (ts.isCallExpression(node)) {
      const reference = classifyDynamicImport(node)

      if (reference) {
        references.push(reference)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return references
}

export function extractTopLevelStringConstDeclarations(
  source: string,
  fileName = 'fixture.ts',
): StringConstDeclaration[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const declarations: StringConstDeclaration[] = []

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue
      }

      const value = readStringInitializerValue(declaration.initializer)

      if (value === null) {
        continue
      }

      declarations.push({
        name: declaration.name.text,
        value,
      })
    }
  }

  return declarations
}

function isExternalOrBuiltinSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('node:') ||
    (!specifier.startsWith('.') && !specifier.startsWith('/'))
  )
}

function resolvesInsideSharedRoot(
  filePath: string,
  specifier: string,
): boolean {
  if (isExternalOrBuiltinSpecifier(specifier)) {
    return false
  }

  const fileDir = dirname(resolve(process.cwd(), filePath))
  const resolvedPath = resolve(fileDir, specifier)
  const pathInsideShared = relative(SHARED_ROOT, resolvedPath)

  return (
    pathInsideShared !== '' &&
    !pathInsideShared.startsWith('..') &&
    !isAbsolute(pathInsideShared)
  )
}

function readOperationalSource(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8')
}

describe('extractModuleReferences', () => {
  it('from import를 탐지한다', () => {
    const references = extractModuleReferences(
      "import { fetchEximRatesWithLookback } from './lib/fetchEximRates.js'",
    )

    expect(references).toEqual([
      { specifier: './lib/fetchEximRates.js', runtime: true },
    ])
  })

  it('type-only import는 runtime false로 탐지한다', () => {
    const references = extractModuleReferences(
      "import type { OfficialExchangeRates } from '../../src/shared/model/index.js'",
    )

    expect(references).toEqual([
      {
        specifier: '../../src/shared/model/index.js',
        runtime: false,
      },
    ])
  })

  it('side-effect import를 탐지한다', () => {
    const references = extractModuleReferences("import './polyfill.js'")

    expect(references).toEqual([{ specifier: './polyfill.js', runtime: true }])
  })

  it('dynamic import를 탐지한다', () => {
    const references = extractModuleReferences(
      "const module = await import('./lazy.js')",
    )

    expect(references).toEqual([{ specifier: './lazy.js', runtime: true }])
  })

  it('일반 함수 호출은 dynamic import로 탐지하지 않는다', () => {
    const references = extractModuleReferences(
      "const module = await loadModule('./lazy.js')",
    )

    expect(references).toEqual([])
  })

  it('export ... from을 탐지한다', () => {
    const references = extractModuleReferences(
      "export { fetchEximRatesWithLookback } from './lib/fetchEximRates.js'",
    )

    expect(references).toEqual([
      { specifier: './lib/fetchEximRates.js', runtime: true },
    ])
  })

  it('mixed named import에서 값 import가 있으면 runtime true다', () => {
    const references = extractModuleReferences(`
      import {
        hasSupportedRates,
        type EximRateRow,
      } from './parseEximRates.js'
    `)

    expect(references).toEqual([
      { specifier: './parseEximRates.js', runtime: true },
    ])
  })

  it('export type ... from은 runtime false다', () => {
    const references = extractModuleReferences(
      "export type { CurrencyCode } from '../../src/shared/model/index.js'",
    )

    expect(references).toEqual([
      {
        specifier: '../../src/shared/model/index.js',
        runtime: false,
      },
    ])
  })
})

describe('extractTopLevelStringConstDeclarations', () => {
  it("const SOURCE = '한국수출입은행'을 탐지한다", () => {
    const declarations = extractTopLevelStringConstDeclarations(
      "const SOURCE = '한국수출입은행'",
    )

    expect(declarations).toEqual([
      { name: 'SOURCE', value: '한국수출입은행' },
    ])
  })

  it('큰따옴표와 줄바꿈이 있어도 탐지한다', () => {
    const declarations = extractTopLevelStringConstDeclarations(`
      const SOURCE =
        "한국수출입은행"
    `)

    expect(declarations).toEqual([
      { name: 'SOURCE', value: '한국수출입은행' },
    ])
  })

  it('타입 주석이 있어도 탐지한다', () => {
    const declarations = extractTopLevelStringConstDeclarations(
      "const SOURCE: string = '한국수출입은행'",
    )

    expect(declarations).toEqual([
      { name: 'SOURCE', value: '한국수출입은행' },
    ])
  })

  it('let 선언은 제외한다', () => {
    const declarations = extractTopLevelStringConstDeclarations(
      "let SOURCE = '한국수출입은행'",
    )

    expect(declarations).toEqual([])
  })

  it('숫자 initializer는 제외한다', () => {
    const declarations = extractTopLevelStringConstDeclarations(
      'const TIMEOUT = 8000',
    )

    expect(declarations).toEqual([])
  })

  it('함수 내부의 const는 제외한다', () => {
    const declarations = extractTopLevelStringConstDeclarations(`
      function run() {
        const SOURCE = '한국수출입은행'
      }
    `)

    expect(declarations).toEqual([])
  })
})

describe('api operational import specifiers', () => {
  for (const file of OPERATIONAL_API_FILES) {
    it(`${file} uses .js import specifiers only`, () => {
      const references = extractModuleReferences(readOperationalSource(file), file)
      const tsSpecifiers = references
        .map((reference) => reference.specifier)
        .filter((specifier) => specifier.endsWith('.ts'))

      expect(tsSpecifiers).toEqual([])
    })
  }

  for (const file of OPERATIONAL_API_FILES) {
    it(`${file} does not runtime-import src/shared modules`, () => {
      const references = extractModuleReferences(readOperationalSource(file), file)
      const sharedRuntimeImports = references.filter(
        (reference) =>
          reference.runtime &&
          resolvesInsideSharedRoot(file, reference.specifier),
      )

      expect(sharedRuntimeImports).toEqual([])
    })
  }

  it('fetchEximRates.ts defines OFFICIAL_EXCHANGE_RATES_SOURCE locally', () => {
    const declarations = extractTopLevelStringConstDeclarations(
      readOperationalSource('api/lib/fetchEximRates.ts'),
      'api/lib/fetchEximRates.ts',
    )

    expect(declarations).toContainEqual({
      name: 'OFFICIAL_EXCHANGE_RATES_SOURCE',
      value: '한국수출입은행',
    })
  })
})
