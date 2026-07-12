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
 * 위반이 있으면 파일 경로, import 문, 위반 이유를 출력하고 exit code 1로 종료한다.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(SCRIPT_DIR, '..')
const SRC_DIR = join(ROOT_DIR, 'src')
const API_DIR = join(ROOT_DIR, 'api')

/** 레이어 순서(낮을수록 하위). app이 가장 상위, shared가 가장 하위다 */
const LAYER_ORDER = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']
const LAYER_RANK = new Map(LAYER_ORDER.map((layer, index) => [layer, index]))

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs'])
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git'])

const fileContentCache = new Map()
const exportTableCache = new Map()
const violations = []

function readFileCached(absPath) {
  if (!fileContentCache.has(absPath)) {
    fileContentCache.set(absPath, readFileSync(absPath, 'utf8'))
  }
  return fileContentCache.get(absPath)
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

/**
 * 파일 하나의 소스에서 import/export-from 구문을 모두 뽑아 "의존 관계 edge" 목록으로 만든다.
 * named({A, type B as C})/namespace(* as X)/default(X)/wildcard(export * from)/dynamic(import(...))
 * 형태를 모두 인식한다.
 */
function parseEdges(content) {
  const edges = []

  for (const match of content.matchAll(
    /\b(import|export)\s+(type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\4/g,
  )) {
    const [raw, keyword, typeKeyword, specifiersRaw, , source] = match
    const specifiers = specifiersRaw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const withoutInlineType = part.replace(/^type\s+/, '')
        const [importedName, aliasName] = withoutInlineType.split(/\s+as\s+/).map((s) => s.trim())
        return { importedName, localName: aliasName ?? importedName }
      })

    edges.push({
      raw: collapseWhitespace(raw),
      isExport: keyword === 'export',
      isTypeOnly: Boolean(typeKeyword),
      kind: 'named',
      specifiers,
      source,
    })
  }

  for (const match of content.matchAll(
    /\b(import|export)\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from\s*(['"])([^'"]+)\3/g,
  )) {
    const [raw, keyword, localName, , source] = match

    edges.push({
      raw: collapseWhitespace(raw),
      isExport: keyword === 'export',
      isTypeOnly: false,
      kind: 'namespace',
      specifiers: [{ importedName: '*', localName }],
      source,
    })
  }

  for (const match of content.matchAll(/\bexport\s*\*\s*from\s*(['"])([^'"]+)\1/g)) {
    const [raw, , source] = match

    edges.push({
      raw: collapseWhitespace(raw),
      isExport: true,
      isTypeOnly: false,
      kind: 'wildcard',
      specifiers: [],
      source,
    })
  }

  for (const match of content.matchAll(
    /\bimport\s+([A-Za-z_$][\w$]*)\s+from\s*(['"])([^'"]+)\2/g,
  )) {
    const [raw, localName, , source] = match

    edges.push({
      raw: collapseWhitespace(raw),
      isExport: false,
      isTypeOnly: false,
      kind: 'default',
      specifiers: [{ importedName: 'default', localName }],
      source,
    })
  }

  for (const match of content.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)) {
    const [raw, , source] = match

    edges.push({
      raw: collapseWhitespace(raw),
      isExport: false,
      isTypeOnly: false,
      kind: 'dynamic',
      specifiers: [],
      source,
    })
  }

  return edges
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
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
 * 슬라이스의 index.ts(public API)가 실제로 어떤 이름을 export하는지 파싱한다.
 * `export {} from`류 재-export 체인만 지원하며(이 프로젝트의 모든 index.ts가 이 형태다),
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

  const content = readFileCached(indexAbsPath)
  const names = new Set()
  let hasWildcard = false

  for (const edge of parseEdges(content)) {
    if (!edge.isExport) {
      continue
    }

    if (edge.kind === 'wildcard') {
      hasWildcard = true
      continue
    }

    for (const specifier of edge.specifiers) {
      names.add(specifier.localName)
    }
  }

  if (/\bexport\s+default\b/.test(content)) {
    names.add('default')
  }

  for (const match of content.matchAll(
    /\bexport\s+(?:async\s+)?(?:function|class|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1])
  }

  for (const match of content.matchAll(/\bexport\s+const\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1])
  }

  for (const match of content.matchAll(/\bexport\s+type\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    names.add(match[1])
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
  const content = readFileCached(filePath)
  const edges = parseEdges(content)
  const importerIsApi = isUnderDir(filePath, API_DIR)
  const importerBoundary = toBoundary(filePath)

  if (!importerBoundary && !importerIsApi) {
    return // src 바로 아래 부트스트랩 파일(main.tsx 등) — 검사 대상 경계가 없다
  }

  for (const edge of edges) {
    checkDependencyEdge(filePath, edge, edge.source, importerIsApi, importerBoundary)
  }
}

function checkDependencyEdge(filePath, edge, source, importerIsApi, importerBoundary) {
  const targetAbs = resolveImportPath(filePath, source)

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

  if (edge.kind !== 'named') {
    return // namespace/default/dynamic import는 개별 이름 존재 여부를 판단할 수 없다
  }

  const table = getExportTable(targetAbs)

  if (!table || table.hasWildcard) {
    return // index.ts를 파싱할 수 없거나 wildcard re-export가 있어 이름 목록을 알 수 없다
  }

  for (const specifier of edge.specifiers) {
    if (!table.names.has(specifier.importedName)) {
      reportViolation(
        filePath,
        edge,
        `'${specifier.importedName}'은 ${targetBoundary.key}의 public API(index.ts)가 export하지 않는 이름입니다.`,
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
