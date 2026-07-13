#!/usr/bin/env node
/**
 * FSD(Feature-Sliced Design) 아키텍처 자동검사.
 *
 * .cursor/rules/00-architecture.mdc의 규칙을 코드로 강제한다.
 *
 * 레이어 순서(하위 → 상위): shared → entities → features → widgets → pages → app
 * 상위 레이어는 하위 레이어를 import할 수 있지만 그 반대는 금지한다.
 *
 * 검사 규칙:
 *   1. 하위 레이어가 상위 레이어를 import하면 위반이다(역방향 import).
 *   2. 같은 레이어의 다른 슬라이스를 import하면 위반이다(shared는 예외 — shared는
 *      "슬라이스"가 아니라 model/lib/api/config/ui 같은 "세그먼트"로 구성되어
 *      세그먼트 간 참조를 허용한다).
 *   3. 다른 슬라이스/세그먼트의 내부 파일(model/lib/ui 등)을 깊은 경로로 import하면
 *      위반이다. 반드시 그 슬라이스의 `index.ts`(public API)를 통해서만 import해야 한다.
 *   4. import한 이름이 대상 슬라이스의 `index.ts`가 실제로 export하지 않는 이름이면
 *      위반이다(존재하지 않는 public API 사용).
 *
 * 검사 대상: src/**\/*.{ts,tsx}. api/ 디렉터리가 있으면 그 안의 *.{ts,tsx,js,mjs}도
 * 검사하지만, api는 FSD UI 레이어 순서 규칙(1, 2번)의 적용 대상이 아니다 — api에서
 * src 레이어로의 import는 3, 4번(public API 경계) 규칙만 적용한다.
 *
 * import/export 구문은 정규식이 아니라 TypeScript Compiler API(실제 AST)로 인식한다.
 * 주석이나 문자열 리터럴 안의 "import ... from ..." 같은 텍스트는 AST 노드가 아니므로
 * 애초에 매칭 대상이 되지 않는다.
 *
 * 위반이 있으면 파일 경로, import 문, 위반 이유를 출력하고 exit code 1로 종료한다.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
// ARCH_CHECK_ROOT는 테스트에서 임시 fixture 디렉터리를 검사 대상으로 지정하기 위한
// override다. 지정하지 않으면 항상 이 스크립트가 위치한 저장소 루트를 사용한다.
const ROOT_DIR = process.env.ARCH_CHECK_ROOT
  ? resolve(process.env.ARCH_CHECK_ROOT)
  : resolve(SCRIPT_DIR, '..')
const SRC_DIR = join(ROOT_DIR, 'src')
const API_DIR = join(ROOT_DIR, 'api')

/** 레이어 순서(낮을수록 하위). app이 가장 상위, shared가 가장 하위다 */
const LAYER_ORDER = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']
const LAYER_RANK = new Map(LAYER_ORDER.map((layer, index) => [layer, index]))

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs'])
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git'])

const sourceFileCache = new Map()
const exportTableCache = new Map()
const violations = []

/** 파일 확장자에 맞는 ts.ScriptKind을 고른다(.tsx/.jsx는 JSX 파서가 필요하다) */
function scriptKindFor(absPath) {
  switch (extname(absPath)) {
    case '.tsx':
      return ts.ScriptKind.TSX
    case '.jsx':
      return ts.ScriptKind.JSX
    case '.js':
    case '.mjs':
      return ts.ScriptKind.JS
    default:
      return ts.ScriptKind.TS
  }
}

/** 파일을 TypeScript AST(SourceFile)로 파싱해 캐시한다. 실제 구문 분석이므로
 * 주석/문자열 리터럴 속 텍스트는 애초에 노드로 나타나지 않는다. */
function getSourceFile(absPath) {
  if (sourceFileCache.has(absPath)) {
    return sourceFileCache.get(absPath)
  }

  const text = readFileSync(absPath, 'utf8')
  const sourceFile = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(absPath),
  )
  sourceFileCache.set(absPath, sourceFile)
  return sourceFile
}

/** 디렉터리를 재귀적으로 순회해 검사 대상 파일(ts/tsx/js/mjs) 절대경로 목록을 모은다 */
function collectFiles(dir) {
  if (!existsSync(dir)) {
    return []
  }

  const results = []
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) {
      continue
    }

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath))
      continue
    }

    const dotIndex = entry.name.lastIndexOf('.')
    const ext = dotIndex === -1 ? '' : entry.name.slice(dotIndex)

    if (SCAN_EXTENSIONS.has(ext) && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath)
    }
  }

  return results
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 하나의 named import/export specifier(`{ a, b as c, type d }`의 각 원소)를
 * { importedName, localName, isTypeOnly } 형태로 정규화한다.
 * import는 "소스 모듈에서의 이름"이 propertyName ?? name이고,
 * export도 동일한 AST 모양(ExportSpecifier)을 쓰므로 같은 로직을 재사용할 수 있다.
 */
function normalizeSpecifier(node) {
  const importedName = (node.propertyName ?? node.name).text
  const localName = node.name.text
  const isTypeOnly = Boolean(node.isTypeOnly)
  return { importedName, localName, isTypeOnly }
}

/**
 * 파일 하나의 AST에서 import/export-from 구문을 모두 뽑아 "의존 관계 edge" 목록으로 만든다.
 * default/named/namespace/default+named 결합/export-from/export *(wildcard)/type-only/동적
 * import(...) 형태를 모두 인식한다.
 */
function parseEdges(sourceFile) {
  const edges = []

  function addEdge(node, source, fields) {
    edges.push({
      raw: collapseWhitespace(node.getText(sourceFile)),
      source,
      isExport: false,
      isTypeOnly: false,
      defaultSpecifier: null,
      namespaceSpecifier: null,
      namedSpecifiers: [],
      isWildcard: false,
      isDynamic: false,
      ...fields,
    })
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const source = node.moduleSpecifier.text
      const clause = node.importClause

      if (!clause) {
        // side-effect import: import './index.css' — 바인딩이 없어 이름 검사 대상이 없다
        addEdge(node, source, { isExport: false })
      } else {
        const isTypeOnly = Boolean(clause.isTypeOnly)
        const defaultSpecifier = clause.name
          ? { importedName: 'default', localName: clause.name.text, isTypeOnly }
          : null

        let namespaceSpecifier = null
        let namedSpecifiers = []

        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            namespaceSpecifier = {
              importedName: '*',
              localName: clause.namedBindings.name.text,
              isTypeOnly,
            }
          } else if (ts.isNamedImports(clause.namedBindings)) {
            namedSpecifiers = clause.namedBindings.elements.map(normalizeSpecifier)
          }
        }

        addEdge(node, source, {
          isExport: false,
          isTypeOnly,
          defaultSpecifier,
          namespaceSpecifier,
          namedSpecifiers,
        })
      }
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const source = node.moduleSpecifier.text
      const isTypeOnly = Boolean(node.isTypeOnly)
      const exportClause = node.exportClause

      if (!exportClause) {
        // export * from '...' — 이름을 알 수 없는 wildcard re-export
        addEdge(node, source, { isExport: true, isTypeOnly, isWildcard: true })
      } else if (ts.isNamespaceExport(exportClause)) {
        // export * as name from '...'
        addEdge(node, source, {
          isExport: true,
          isTypeOnly,
          namespaceSpecifier: { importedName: '*', localName: exportClause.name.text, isTypeOnly },
        })
      } else if (ts.isNamedExports(exportClause)) {
        addEdge(node, source, {
          isExport: true,
          isTypeOnly,
          namedSpecifiers: exportClause.elements.map(normalizeSpecifier),
        })
      }
    }

    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference
      if (ts.isExternalModuleReference(ref) && ts.isStringLiteral(ref.expression)) {
        addEdge(node, ref.expression.text, {
          isExport: false,
          defaultSpecifier: { importedName: 'default', localName: node.name.text, isTypeOnly: false },
        })
      }
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments
      if (arg && ts.isStringLiteral(arg)) {
        addEdge(node, arg.text, { isExport: false, isDynamic: true })
      }
    }

    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      // export default <expr>; — 이름 존재 검사용 export table 구축에서만 쓰인다(의존 edge는 없음)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return edges
}

/** relative import 경로를 실제 파일 경로로 해석한다(확장자 생략, 디렉터리 index 생략 모두 지원) */
function resolveImportPath(fromFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null // 외부 패키지(react, @supabase/supabase-js 등) — FSD 검사 대상이 아니다
  }

  const baseDir = dirname(fromFile)
  const target = resolve(baseDir, specifier)
  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    join(target, 'index.ts'),
    join(target, 'index.tsx'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate
    }
  }

  return null
}

/**
 * 절대경로를 FSD "경계"(레이어+슬라이스/세그먼트) 정보로 바꾼다.
 * src 바깥이거나, src 바로 아래(main.tsx 등 부트스트랩 파일)면 null을 반환한다.
 */
function toBoundary(absPath) {
  const rel = relative(SRC_DIR, absPath)

  if (rel.startsWith('..') || rel === '') {
    return null
  }

  const parts = rel.split(sep)
  const layer = parts[0]

  if (!LAYER_ORDER.includes(layer)) {
    return null
  }

  const sliceOrSegment = layer === 'app' ? 'app' : parts[1] ?? layer

  return { layer, slice: sliceOrSegment, key: `${layer}/${sliceOrSegment}` }
}

function isUnderDir(absPath, dir) {
  const rel = relative(dir, absPath)
  return !rel.startsWith('..') && rel !== ''
}

function indexCandidatesFor(boundary) {
  const base = join(SRC_DIR, boundary.layer, boundary.slice)
  return [join(base, 'index.ts'), join(base, 'index.tsx')]
}

/**
 * 슬라이스의 index.ts(public API)가 실제로 어떤 이름을 export하는지 AST로 파싱한다.
 * `export {} from`류 재-export 체인뿐 아니라 index.ts가 직접 선언(함수/상수/클래스/
 * 인터페이스/enum/type/default)을 export하는 경우도 인식한다.
 * `export *`(wildcard re-export)가 있으면 이름을 알 수 없으므로 hasWildcard로 표시해
 * 존재 여부 검사를 건너뛰게 한다.
 */
function getExportTable(indexAbsPath) {
  if (exportTableCache.has(indexAbsPath)) {
    return exportTableCache.get(indexAbsPath)
  }

  if (!existsSync(indexAbsPath)) {
    exportTableCache.set(indexAbsPath, null)
    return null
  }

  const sourceFile = getSourceFile(indexAbsPath)
  const names = new Set()
  let hasWildcard = false

  for (const edge of parseEdges(sourceFile)) {
    if (!edge.isExport) {
      continue
    }

    if (edge.isWildcard) {
      hasWildcard = true
      continue
    }

    if (edge.namespaceSpecifier) {
      names.add(edge.namespaceSpecifier.localName)
    }

    for (const specifier of edge.namedSpecifiers) {
      names.add(specifier.localName)
    }
  }

  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
    const isExported = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false

    if (ts.isExportAssignment(statement)) {
      names.add('default')
      continue
    }

    if (!isExported) {
      continue
    }

    const isDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false

    if (isDefault) {
      names.add('default')
      continue
    }

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      if (statement.name) {
        names.add(statement.name.text)
      }
      continue
    }

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          names.add(decl.name.text)
        }
      }
    }
  }

  const table = { names, hasWildcard }
  exportTableCache.set(indexAbsPath, table)
  return table
}

function reportViolation(filePath, edge, reason) {
  violations.push({
    file: relative(ROOT_DIR, filePath),
    statement: edge.raw,
    reason,
  })
}

function checkFile(filePath) {
  const sourceFile = getSourceFile(filePath)
  const edges = parseEdges(sourceFile)
  const importerIsApi = isUnderDir(filePath, API_DIR)
  const importerBoundary = toBoundary(filePath)

  if (!importerBoundary && !importerIsApi) {
    return // src 바로 아래 부트스트랩 파일(main.tsx 등) — 검사 대상 경계가 없다
  }

  for (const edge of edges) {
    checkDependencyEdge(filePath, edge, importerIsApi, importerBoundary)
  }
}

function checkDependencyEdge(filePath, edge, importerIsApi, importerBoundary) {
  const targetAbs = resolveImportPath(filePath, edge.source)

  if (!targetAbs) {
    return // 외부 패키지이거나 해석할 수 없는 경로 — 검사 대상이 아니다
  }

  const targetBoundary = toBoundary(targetAbs)

  if (!targetBoundary) {
    return // 대상이 src 레이어 경계 밖(예: main.tsx, 정적 asset) — 검사 대상이 아니다
  }

  const sameBoundary = importerBoundary && importerBoundary.key === targetBoundary.key

  if (sameBoundary) {
    return // 같은 슬라이스/세그먼트 내부 참조 — 항상 허용
  }

  if (!importerIsApi) {
    if (importerBoundary.layer === targetBoundary.layer) {
      if (importerBoundary.layer !== 'shared') {
        reportViolation(
          filePath,
          edge,
          `동일 레이어(${importerBoundary.layer})의 다른 슬라이스(${targetBoundary.slice})를 import했습니다. ` +
            `같은 레이어의 슬라이스 간 import는 금지되어 있습니다(공유가 필요하면 entities/shared로 내려야 합니다).`,
        )
        return
      }
      // shared는 세그먼트(model/lib/api/config/ui) 간 참조를 허용한다. 아래 public API 검사로 계속 진행한다.
    } else if (LAYER_RANK.get(importerBoundary.layer) < LAYER_RANK.get(targetBoundary.layer)) {
      reportViolation(
        filePath,
        edge,
        `하위 레이어(${importerBoundary.layer})가 상위 레이어(${targetBoundary.layer})를 import했습니다. ` +
          `의존 방향은 항상 app → pages → widgets → features → entities → shared여야 합니다.`,
      )
      return
    }
  }

  const indexCandidates = indexCandidatesFor(targetBoundary)

  if (!indexCandidates.includes(targetAbs)) {
    reportViolation(
      filePath,
      edge,
      `${targetBoundary.key}의 public API(index.ts)를 거치지 않고 내부 파일을 직접 import했습니다(deep import). ` +
        `반드시 '${relative(ROOT_DIR, join(SRC_DIR, targetBoundary.layer, targetBoundary.slice))}'의 index.ts를 통해서만 import해야 합니다.`,
    )
    return
  }

  if (edge.isDynamic || edge.namespaceSpecifier) {
    return // 동적 import(...)나 namespace import(* as X)는 개별 이름 존재 여부를 판단할 수 없다
  }

  const table = getExportTable(targetAbs)

  if (!table || table.hasWildcard) {
    return // index.ts를 파싱할 수 없거나 wildcard re-export가 있어 이름 목록을 알 수 없다
  }

  const namesToCheck = [
    ...(edge.defaultSpecifier ? [edge.defaultSpecifier.importedName] : []),
    ...edge.namedSpecifiers.map((specifier) => specifier.importedName),
  ]

  for (const importedName of namesToCheck) {
    if (!table.names.has(importedName)) {
      reportViolation(
        filePath,
        edge,
        `'${importedName}'은 ${targetBoundary.key}의 public API(index.ts)가 export하지 않는 이름입니다.`,
      )
    }
  }
}

function main() {
  const files = [...collectFiles(SRC_DIR), ...collectFiles(API_DIR)]

  for (const file of files) {
    checkFile(file)
  }

  if (violations.length === 0) {
    console.log(`✅ FSD 아키텍처 검사 통과 (검사한 파일: ${files.length}개)`)
    return 0
  }

  console.error(`❌ FSD 아키텍처 위반 ${violations.length}건 발견\n`)

  for (const violation of violations) {
    console.error(`파일: ${violation.file}`)
    console.error(`import 문: ${violation.statement}`)
    console.error(`위반 이유: ${violation.reason}`)
    console.error('')
  }

  return 1
}

process.exit(main())
