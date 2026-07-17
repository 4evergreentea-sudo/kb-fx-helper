# KB 외환 도우미 (KB FX Helper)

은행 외환 창구 직원의 환전·해외송금 계산과 거래기록 관리를 돕는 웹 기반 보조 도구입니다.

- **GitHub 저장소**: <https://github.com/4evergreentea-sudo/kb-fx-helper>
- **배포 서비스**: <https://kb-fx-helper-orcin.vercel.app>

> 자세한 배경과 요구사항은 [`docs/PRD.md`](docs/PRD.md)를 참고하세요.

## 목차

1. [프로젝트 배경](#프로젝트-배경)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [프로젝트 구조](#프로젝트-구조)
5. [설치 및 실행](#설치-및-실행)
6. [환경 변수](#환경-변수)
7. [테스트 및 품질 검증](#테스트-및-품질-검증)
8. [AI 협업 도구 체인](#ai-협업-도구-체인)
9. [보안 및 개인정보 안내](#보안-및-개인정보-안내)
10. [문서 인덱스](#문서-인덱스)
11. [라이선스](#라이선스)

---

## 프로젝트 배경

은행 외환 창구 직원은 고객을 대상으로 환전, 해외송금 등의 업무를 처리하면서 환율 계산과 거래 내용을 수기 또는 별도 계산기로 처리하는 경우가 많습니다. 이 과정은 반복적인 계산으로 인한 실수 위험이 있고, 거래 이력을 별도로 정리하지 않으면 이후 확인이 어렵습니다.

KB 외환 도우미는 창구 업무 중 환율 계산과 거래 기록 확인을 빠르고 정확하게 도와주는 것을 목표로 합니다. 환전·송금 계산 및 localStorage 기반 핵심 기능은 별도 로그인 없이 사용할 수 있습니다. 공식 환율 조회는 Vercel Function을, 선택적 클라우드 동기화는 Supabase 익명 인증을 사용합니다.

## 주요 기능

### 필수 기능

| 기능 | 설명 | 상태 |
|---|---|---|
| 환전 계산기 | 외화 금액과 환율을 입력받아 원화 환산 금액을 계산 (JPY 100단위 고시가 처리 포함) | ✅ 구현 완료 |
| 거래기록 관리 | 환전·해외송금·상담 기록을 등록하고 조회·검색·삭제 | ✅ 구현 완료 |
| localStorage 저장 | 입력한 거래 기록을 브라우저 localStorage에 저장해 새로고침 후에도 유지 | ✅ 구현 완료 |

### 고급 기능

| 기능 | 설명 | 상태 |
|---|---|---|
| 해외송금 계산기 | 전신환 적용환율, 송금 원금, 수수료·전신료를 포함한 총 출금액 계산 | ✅ 구현 완료 |
| 한국수출입은행 공식 고시환율 조회 | 한국수출입은행 공식 고시환율(일별)을 Vercel Function으로 조회, 최근 7일 lookback 포함 | ✅ 구현 완료 |
| CSV 내보내기 | 거래 기록을 CSV로 내보내기 (RFC 4180 escape, UTF-8 BOM, CSV Injection 방지) | ✅ 구현 완료 |
| Supabase 클라우드 동기화 | 익명 인증 + RLS 기반으로 거래 기록을 클라우드에 best-effort 동기화 | ✅ 구현 완료 |
| Vercel 배포 | Vercel Serverless Function으로 외부 API 키(`EXIM_API_KEY`)를 서버 측에만 격리 | ✅ 구현 완료 |

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| 빌드 도구 | Vite 8 |
| 아키텍처 | Feature-Sliced Design (FSD) |
| 테스트 | Vitest 4 |
| 린트 | oxlint |
| 클라우드 DB | Supabase (Postgres + RLS) |
| 배포/서버리스 | Vercel (Serverless Function) |
| 외부 API | 한국수출입은행 환율 API |
| AI 협업 | Cursor Rules, MCP(filesystem/context7), CodeRabbit, GitHub Actions |

## 프로젝트 구조

이 프로젝트는 Feature-Sliced Design(FSD)을 따르며, 의존 방향은 항상 `app → pages → widgets → features → entities → shared`입니다.

```text
src/
├── app/        # 앱 진입점, 전역 조립
├── pages/      # dashboard — 위젯 조합
├── widgets/    # exchange-panel, remittance-panel, transaction-history-panel
├── features/   # calculate-exchange, calculate-remittance, add-transaction,
│               # search-transaction, export-transactions-csv, load-exchange-rates
├── entities/   # currency, rate, remittance, transaction
└── shared/     # ui, lib, api, config, model
api/            # Vercel Function (한국수출입은행 API 프록시)
```

각 슬라이스는 `index.ts`(public API)를 통해서만 외부에 노출되며, 이 규칙은 `.cursor/rules/00-architecture.mdc`와 AST 기반 자동 검사 스크립트(`npm run arch:check`)로 강제됩니다.

레이어 설계 배경과 도메인 모델은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)를 참고하세요.

## 설치 및 실행

### 요구사항

- Node.js 20 이상
- 권장 및 CI 환경: Node.js 22
- npm

### 실행 방법

이 프로젝트는 실행 목적에 따라 두 가지 방법으로 실행할 수 있습니다.

#### A. 핵심 프런트엔드 기능 실행

```bash
git clone https://github.com/4evergreentea-sudo/kb-fx-helper.git
cd kb-fx-helper
npm install
npm run dev
```

`npm run dev`는 Vite 개발 서버만 실행합니다. 환전·해외송금 계산과 거래기록의 localStorage 저장/조회 등 핵심 기능은 환경변수 설정 없이도 바로 사용할 수 있습니다. Supabase 클라우드 동기화나 공식 환율 조회(방법 B)를 사용하려면 `cp .env.example .env.local`로 환경변수 파일을 준비한 뒤 필요한 값만 채우세요. **Supabase를 사용하지 않는다면** `.env.local`의 `VITE_SUPABASE_URL`과 관련 키 값은 예시 문자열을 빈 값으로 바꾸거나 해당 줄 앞에 `#`을 붙여 주석 처리하세요(값이 없으면 Supabase 연동은 자동으로 비활성화됩니다).

#### B. 공식 환율 API를 포함한 전체 기능 실행

```bash
git clone https://github.com/4evergreentea-sudo/kb-fx-helper.git
cd kb-fx-helper
npm install
cp .env.example .env.local
npx vercel dev
```

`npx vercel dev`는 Vite 개발 서버와 Vercel Function인 `/api/exchange-rates`를 함께 로컬에서 실행합니다. 한국수출입은행 공식 고시환율 조회 기능까지 사용하려면 이 방법으로 실행해야 하며, `.env.local`에 `EXIM_API_KEY`가 설정되어 있어야 합니다. 실제 키 값은 로컬 `.env.local`에만 두고 저장소에 커밋하지 않습니다.

프로덕션 배포 시 환경변수(`EXIM_API_KEY`, `VITE_SUPABASE_URL` 등)는 Vercel Dashboard(Project Settings → Environment Variables)에서 등록합니다.

### 주요 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (프런트엔드만, `/api` 미포함) |
| `npx vercel dev` | 개발 서버 + Vercel Function(`/api/exchange-rates`) 함께 실행 |
| `npm run build` | 타입체크(`tsc -b`) + 프로덕션 빌드(`vite build`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run test` / `npm run test:run` | Vitest 테스트 1회 실행 |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run lint` | oxlint 실행 |
| `npm run arch:check` | FSD 아키텍처(레이어/의존/public API) 자동 검사 |
| `npm run typecheck` | 타입 오류만 검사(빌드 없이) |
| `npm run check` | `lint → arch:check → typecheck → test:run → build`를 순서대로 일괄 실행 |

## 환경 변수

Supabase 클라우드 동기화 또는 한국수출입은행 공식 고시환율 조회(설치 및 실행의 방법 B)를 사용할 때만 `.env.example`을 복사해 `.env.local`을 만들고 필요한 값을 채웁니다. **핵심 프런트엔드 기능(방법 A)은 `.env.local` 없이도 정상 동작합니다.** Supabase를 사용하지 않는 경우, `.env.local`의 `VITE_SUPABASE_URL`과 키 값은 빈 문자열로 두거나 해당 줄 앞에 `#`을 붙여 주석 처리하세요.

| 변수 | 필수 여부 | 설명 |
|---|---|---|
| `VITE_SUPABASE_URL` | 선택 | Supabase 프로젝트 URL. Settings → API에서 확인 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 선택 | 신규 Supabase 프로젝트의 공개(publishable) 키 |
| `VITE_SUPABASE_ANON_KEY` | 선택 | legacy 프로젝트에서 publishable key가 없을 때만 사용하는 anon key. publishable key가 설정되어 있으면 무시됨 |
| `EXIM_API_KEY` | 선택 | 한국수출입은행 환율 API 키. **서버(Vercel Function) 전용**이며 `VITE_` 접두사가 없어 브라우저에 노출되지 않음 |

> `VITE_` 접두사가 붙은 값은 빌드 시 브라우저 번들에 그대로 포함되므로, service_role/secret 키는 절대 `VITE_` 변수에 넣지 않습니다. 실제 키 값은 이 문서나 저장소에 커밋하지 않습니다.
> 프로덕션 배포 시 환경변수는 Vercel Dashboard(Project Settings → Environment Variables)에서 등록합니다.

## 테스트 및 품질 검증

- 테스트 프레임워크는 Vitest를 사용하며, TDD(실패하는 테스트를 먼저 작성)를 기본 원칙으로 합니다.
- 현재 **54개 테스트 파일, 502개 테스트가 모두 통과**합니다(`npm run test:run` 기준).
- `npm run check` 한 번으로 다음을 순서대로 검증합니다.

```text
lint(oxlint) → arch:check(FSD 아키텍처) → typecheck(tsc) → test:run(Vitest) → build(vite build)
```

- 동일한 명령을 GitHub Actions CI(`.github/workflows/ci.yml`)가 모든 PR과 `main` push마다 실행합니다.
- FSD 레이어/의존 규칙 위반은 `scripts/check-architecture.mjs`가 TypeScript AST 분석으로 자동 검출합니다(단순 정규식이 아님).

## AI 협업 도구 체인

이 프로젝트는 계획부터 배포까지 여러 AI/협업 도구를 단계적으로 연결해 사용합니다.

| 단계 | 도구 | 역할 |
|---|---|---|
| 계획·구현·리뷰 | Cursor Rules(`.cursor/rules/*.mdc`) | FSD 의존 규칙, 도메인 계산 규칙, 보안 규칙 등을 코드 생성 시 자동 강제 |
| 계획·구현 | MCP(filesystem, context7) | 프로젝트 파일 컨텍스트와 최신 라이브러리 문서를 Cursor에 연결 |
| 구현 후 검증 | Vitest, `npm run check` | 로컬에서 커밋 전 자동 검증 |
| PR 리뷰 | CodeRabbit | FSD 위반, public API 우회, 보안 규칙 위반 등을 AI가 1차로 자동 리뷰 |
| 병합 전 검증 | GitHub Actions CI | PR과 `main` push마다 `npm run check` 실행 |
| 배포 | Vercel, Supabase | `main` 병합 시 자동 배포, 거래기록은 Supabase에 클라우드 동기화 |

전체 흐름과 단계별 작업 방식(Plan / 기본 Agent / Ask)은 [`docs/WORKFLOW.md`](docs/WORKFLOW.md)와 [`docs/CUSTOM_MODES.md`](docs/CUSTOM_MODES.md)를 참고하세요.

## 보안 및 개인정보 안내

- **테스트용 이름만 입력하세요.** 거래기록 등록 시 필요한 고객명은 과제 구현(거래기록-고객명 연결) 목적으로만 사용하며, 실제 고객의 개인정보를 입력하지 않습니다. 반드시 테스트용 이름 또는 가명만 사용하세요.
- 주민등록번호, 계좌번호, 전화번호, 주소 등 민감한 개인정보는 어떤 입력란에도 저장하지 않습니다.
- API 키·시크릿은 소스 코드에 하드코딩하지 않고 환경변수로만 관리하며, `.env`류 파일은 git에 커밋하지 않습니다.
- Supabase에는 사용자별 RLS(Row Level Security)가 적용되어 있어, 다른 사용자의 거래기록에 접근할 수 없습니다.
- CSV 내보내기 시 셀 값이 `=`, `+`, `-`, `@`로 시작하면 CSV Injection 방지를 위해 자동으로 escape됩니다.

자세한 정책은 [`.cursor/rules/40-security.mdc`](.cursor/rules/40-security.mdc)를 참고하세요.

## 문서 인덱스

| 문서 | 내용 |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | 프로젝트 배경, 요구사항, 완료 조건 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | FSD 아키텍처, 레이어/의존 규칙, 도메인 설계 |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | AI 협업 Workflow, Git 전략, 테스트 전략, 배포 |
| [`docs/MCP.md`](docs/MCP.md) | MCP 서버 설정·온보딩·보안 체크리스트 |
| [`docs/CUSTOM_MODES.md`](docs/CUSTOM_MODES.md) | Plan / 기본 Agent / Ask 단계별 작업 방식 가이드 |
| [`REPORT.md`](REPORT.md) | 최종 제출 보고서 |

## 라이선스

본 프로젝트는 교육 목적의 과제 제출물입니다. 별도의 오픈소스 라이선스는 지정하지 않습니다.
