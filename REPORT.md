# 최종 제출 보고서 — KB 외환 도우미 (KB FX Helper)

- **GitHub 저장소**: [https://github.com/4evergreentea-sudo/kb-fx-helper](https://github.com/4evergreentea-sudo/kb-fx-helper)
- **배포 서비스**: [https://kb-fx-helper-orcin.vercel.app](https://kb-fx-helper-orcin.vercel.app)

## 목차

1. [개요](#1-개요)
2. [설치 및 실행 방법](#2-설치-및-실행-방법)
3. [요구사항 및 기획](#3-요구사항-및-기획)
4. [아키텍처 설계](#4-아키텍처-설계)
5. [구현 결과](#5-구현-결과)
6. [AI 협업 Workflow 실행 기록](#6-ai-협업-workflow-실행-기록)
7. [테스트 및 품질 검증](#7-테스트-및-품질-검증)
8. [협업 및 코드 리뷰 (GitHub + CodeRabbit)](#8-협업-및-코드-리뷰-github--coderabbit)
9. [배포 및 인프라](#9-배포-및-인프라)
10. [회고 및 향후 개선](#10-회고-및-향후-개선)
11. [부록](#11-부록)

---

## 1. 개요

### 1.1 프로젝트 배경/목표

은행 외환 창구 직원은 환전·해외송금 업무를 처리하면서 환율 계산과 거래 내용을 수기 또는 별도 계산기로 처리하는 경우가 많다. 이 과정은 반복 계산으로 인한 실수 위험이 있고, 거래 이력을 따로 정리하지 않으면 이후 확인이 어렵다.

KB 외환 도우미는 창구 업무 중 환율 계산과 거래 기록 확인을 빠르고 정확하게 도와주는 웹 기반 보조 도구로 기획했다. 환전·송금 계산 및 localStorage 기반 핵심 기능은 별도 로그인 없이 사용할 수 있게 하고, 공식 환율 조회는 Vercel Function을, 선택적 클라우드 동기화는 Supabase 익명 인증을 사용하는 구조로 확장하는 것을 목표로 했다. 원문 요구사항은 `[docs/PRD.md](docs/PRD.md)`에 정리되어 있다.

### 1.2 최종 제출 범위

PRD의 필수 기능 3종을 모두 구현하고, 선택 기능 중 5종을 구현했다.

- **필수 기능**: 환전 계산기, 거래기록 관리, localStorage 저장
- **구현한 고급 기능**: 해외송금 계산기, 한국수출입은행 공식 고시환율 조회, CSV 내보내기, Supabase 클라우드 동기화, Vercel 배포

현재 저장소는 `main` 기준 PR #1~#4가 모두 병합된 상태이며, 54개 테스트 파일·502개 테스트가 통과한다.

---



## 2. 설치 및 실행 방법



### 2.1 요구사항

- Node.js 20 이상
- 권장 및 CI 환경: Node.js 22 (`.github/workflows/ci.yml` 기준)
- npm



### 2.2 저장소 준비

```bash
git clone https://github.com/4evergreentea-sudo/kb-fx-helper.git
cd kb-fx-helper
npm install
```

`.env.local`은 Supabase 클라우드 동기화 또는 한국수출입은행 공식 고시환율 조회(2.4절, 방법 B)를 사용할 때만 필요하다. 핵심 프런트엔드 기능(2.3절, 방법 A)은 환경변수 없이 동작하므로, 이 값이 필요 없다면 `.env.example`을 복사하는 단계를 생략해도 된다. 값을 채우는 경우에도 실제 서비스 키나 실제 고객정보는 입력하지 않는다(고객명은 테스트용 이름·가명만 사용, `[.cursor/rules/40-security.mdc](.cursor/rules/40-security.mdc)` 참고).

### 2.3 실행 방법 A — 핵심 프런트엔드 기능만 (`npm run dev`)

```bash
npm run dev
```

Vite 개발 서버만 실행하는 **프런트엔드 전용** 실행 방법이다. 환전·해외송금 계산, 거래기록의 localStorage 저장/조회는 환경변수를 전혀 설정하지 않아도 정상 동작한다. Supabase 클라우드 동기화를 함께 사용하려면 `cp .env.example .env.local` 후 `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`를 채운다. **Supabase를 사용하지 않는 경우**에는 `.env.local`을 만들 필요가 없으며, 만들었다면 해당 값은 예시 문자열을 빈 값으로 바꾸거나 줄 앞에 `#`을 붙여 주석 처리한다. 이 방법으로는 `/api/exchange-rates`(Vercel Function)가 함께 실행되지 않으므로, 한국수출입은행 공식 고시환율 조회 기능은 사용할 수 없다.

### 2.4 실행 방법 B — 공식 환율 API를 포함한 전체 기능 (`npx vercel dev`)

```bash
cp .env.example .env.local
npx vercel dev
```

Vite 개발 서버와 Vercel Function인 `/api/exchange-rates`를 함께 로컬에서 실행하는 **API 포함 실행** 방법이다. 한국수출입은행 공식 고시환율 조회 기능(`src/features/load-exchange-rates`)까지 사용하려면 이 명령으로 실행해야 하며, 그 전에 `.env.local`에 `EXIM_API_KEY`를 설정해야 한다. 실제 키 값은 저장소에 커밋하지 않는다. `EXIM_API_KEY`가 없으면 `/api/exchange-rates`는 503을 반환하고, 클라이언트는 마지막으로 저장된 값으로 fallback한다.

### 2.5 검증 명령

```bash
npm run check
```

`lint → arch:check → typecheck → test:run → build`를 순서대로 실행해 커밋 전 상태를 검증한다(7장 참고).

### 2.6 배포된 서비스와 환경변수 관리

- 배포 서비스: [https://kb-fx-helper-orcin.vercel.app](https://kb-fx-helper-orcin.vercel.app)
- 프로덕션 환경변수(`EXIM_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)는 로컬 `.env.local`과 별도로 Vercel Dashboard(Project Settings → Environment Variables)에서 등록한다.
- Supabase 값과 `EXIM_API_KEY`는 모두 선택 사항이며, 값을 채우지 않아도 localStorage 기반 핵심 기능(환전·해외송금 계산, 거래기록 저장/조회)은 정상 동작한다.

---



## 3. 요구사항 및 기획



### 3.1 PRD 핵심 요구사항 요약


| 구분         | 내용                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 주요 사용자     | 은행 영업점 외환 창구 담당 직원(텔러)                                                                                   |
| 필수 기능      | 환전 계산기, 거래기록 관리, localStorage 저장                                                                         |
| 선택 기능      | 해외송금 계산기, 실시간 환율, CSV 내보내기, Supabase, Vercel                                                             |
| 완료 조건      | 정확한 환산 계산, 새로고침 후에도 유지되는 거래기록, 잘못된 입력 차단 + 한국어 안내, 데스크톱/모바일 정상 동작                                        |
| 예외 처리      | 숫자가 아닌 값/음수/빈 값 입력 시 계산 차단, localStorage 접근 불가 시 저장 실패 안내(계산은 계속 동작), 실시간 환율 API 실패 시 마지막 저장값으로 fallback |
| 구현하지 않을 범위 | 코어뱅킹 연동, 로그인/다중 사용자, 실제 자금 이동, 법적 효력 있는 증빙 발행, 네이티브 앱                                                    |


> 위 표의 "실시간 환율"은 `[docs/PRD.md](docs/PRD.md)`가 사용하는 원문 표현이다. **과제 명세상 '실시간 환율 API' 항목을 한국수출입은행의 일별 공식 고시환율 조회 방식으로 구현했다.** 실시간 스트리밍이나 초단위로 갱신되는 시세가 아니라, 영업일 기준 하루 단위로 고시되는 공식 환율을 조회하며, 최근 7일 이내 데이터가 없으면 lookback으로 가장 최근 고시일을 찾는다(5.2절 참고).

원문은 `[docs/PRD.md](docs/PRD.md)` 참고.

### 3.2 리서치 도구 관련 안내

`[docs/WORKFLOW.md](docs/WORKFLOW.md)`는 리서치 단계의 후보 도구로 **NotebookLM**(도메인 자료 학습·요약)과 **Genspark**(유사 서비스 조사, 문서 초안 보조)를 표준 Workflow상에 정의하고 있다. 다만 이 두 도구는 **이번 최종 구현의 실행 증빙 대상에는 포함하지 않았다.**

이번 제출에서 실제로 사용·검증한 AI 협업 도구는 다음을 중심으로 한다(6장 참고).

- Cursor **Plan / 기본 Agent / Ask**
- **Cursor Rules**(`.cursor/rules/*.mdc`)
- **filesystem MCP**, **context7 MCP**
- **CodeRabbit**
- **GitHub Actions**

---



## 4. 아키텍처 설계



### 4.1 FSD를 선택한 이유

Feature-Sliced Design(FSD)과 DDD-lite를 비교했을 때, 이 프로젝트(대시보드 1개, 유스케이스 3~4개 수준)에는 FSD가 더 적합하다고 판단했다.

- 화면과 유스케이스가 단순해 DDD의 Bounded Context 분리는 과설계가 된다.
- FSD는 레이어별 폴더 경로가 곧 규칙이므로, `.cursor/rules/*.mdc`의 `globs`로 레이어/슬라이스 단위 규칙을 정확히 걸 수 있어 AI(Cursor) 협업에 유리하다.
- `app → pages → widgets → features → entities → shared`라는 단순한 선형 규칙은 리뷰어(사람 또는 CodeRabbit)가 위반 여부를 즉시 판단할 수 있다.

자세한 비교표와 근거는 `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` 1장 참고.

### 4.2 레이어/의존 규칙

```text
app → pages → widgets → features → entities → shared
```

- 역방향 import 금지(하위 레이어는 상위 레이어를 모른다)
- 동일 레이어 내 슬라이스 간 import 금지(공유가 필요하면 entities/shared로 내림)
- 각 슬라이스는 `index.ts`(public API)를 통해서만 외부에 노출



### 4.3 도메인 설계 및 구현 상태


| 도메인 관심사            | 담당 Layer/Slice                                                            | 구현 상태                                     |
| ------------------ | ------------------------------------------------------------------------- | ----------------------------------------- |
| 환율 계산              | `features/calculate-exchange` + `entities/rate`, `currency`               | 구현 완료                                     |
| 거래기록               | `entities/transaction` + `features/add-transaction`, `search-transaction` | 구현 완료(환전/해외송금/상담 저장, 검색, Supabase 동기화 포함) |
| 송금 계산              | `features/calculate-remittance` + `entities/remittance`                   | 구현 완료                                     |
| localStorage       | `shared/lib/storage.ts`                                                   | 구현 완료                                     |
| 공식 고시환율 조회(외부 API) | `shared/api`, `api/exchange-rates.ts`, `features/load-exchange-rates`     | 구현 완료                                     |


실제 슬라이스 개수: `entities` 4개(currency, rate, remittance, transaction), `features` 6개(calculate-exchange, calculate-remittance, add-transaction, search-transaction, export-transactions-csv, load-exchange-rates), `widgets` 3개(exchange-panel, remittance-panel, transaction-history-panel), `pages` 1개(dashboard).

### 4.4 아키텍처 자동 검사 (`scripts/check-architecture.mjs`)

FSD 규칙은 문서로만 존재하는 것이 아니라, TypeScript Compiler API로 실제 소스 AST를 분석하는 자동 검사 스크립트로 강제된다(`npm run arch:check`, CI에서도 동일하게 실행).

검사 항목:

1. 하위 레이어가 상위 레이어를 import하는지(역방향 import)
2. 동일 레이어의 다른 슬라이스를 import하는지(shared는 세그먼트 간 참조 허용)
3. 슬라이스 내부 파일을 `index.ts`를 거치지 않고 직접 import(deep import)하는지
4. import한 이름이 대상 슬라이스의 `index.ts`가 실제로 export하지 않는 이름인지(존재하지 않는 public API 사용)

주석/문자열 리터럴 속 텍스트는 정규식이 아닌 실제 AST 노드 기반이라 오탐되지 않는다. 이 검사는 `api/` 디렉터리의 public API 경계(3, 4번 규칙)에도 동일하게 적용된다.

---



## 5. 구현 결과



### 5.1 필수 기능 구현

- **환전 계산기** (`src/features/calculate-exchange`, `src/entities/rate`)
  - 계산 순서: 적용환율 반올림(소수 둘째 자리) → 환산 금액 계산 → 원화 정수 반올림. `entities/rate/lib/applyExchangeRate.ts`, `exchangeToKRW.ts`에서 이 순서를 그대로 코드로 표현한다.
  - JPY 등 100단위 고시 통화는 `entities/currency`의 통화 단위 정보를 이용해 100으로 나눈 단가로 환산한다.
  - 입력값이 숫자가 아니거나 음수/빈 값이면 계산을 수행하지 않고 한국어 안내 메시지를 반환한다(`entities/rate/lib/validate.ts`).
- **거래기록 관리** (`src/entities/transaction`, `src/features/add-transaction`, `src/features/search-transaction`)
  - `Transaction`은 `ExchangeTransaction | RemittanceTransaction | ConsultationRecord` 판별 유니온 타입이며, `record_type`으로 구분한다.
  - 신규 저장 시 고객명이 필수이며(테스트용 이름/가명만 허용), 메모는 환전·해외송금은 선택, 상담은 필수다.
  - `features/search-transaction`이 기간·환종 등 조건으로 목록을 필터링한다.
- **localStorage 저장** (`src/shared/lib/storage.ts`)
  - 저장 실패(용량 초과 등) 시 사용자에게 실패를 안내하고, 계산 기능 자체는 계속 사용할 수 있도록 분리했다.



### 5.2 고급 기능 구현



#### 해외송금 계산기

`src/entities/remittance` + `src/features/calculate-remittance`가 전신환 적용환율, 송금 원금, 송금수수료, 전신료를 계산해 총 출금액을 산출한다. `add-transaction`은 이 feature를 직접 import하지 않고, widget이 계산 결과를 `AddRemittanceTransactionInput`으로 조립해 전달하는 방식으로 레이어 경계를 유지했다.

#### 한국수출입은행 공식 고시환율 조회 (Vercel Function 프록시)

- `api/exchange-rates.ts`가 **Vercel Function**으로 동작하며 `GET`으로 한국수출입은행 공식 고시환율 API를 프록시한다. 영업일 기준 일별로 고시되는 공식 환율을 조회하는 것으로, 실시간 스트리밍 시세를 제공하지는 않는다. API 키(`EXIM_API_KEY`)는 서버 환경변수에만 존재하고 클라이언트에 노출되지 않는다.
- `api/lib/fetchEximRates.ts`가 실제 외부 호출과 최근 7일 lookback(주말·공휴일 등 데이터 없는 날 대응)을 담당하고, `api/lib/kstDate.ts`가 한국 시간 기준 날짜를 계산한다.
- 클라이언트의 `src/features/load-exchange-rates`가 이 API를 호출해 환율 필드를 자동 채움하고, 실패 시 기존 입력값을 유지한 채 오류를 안내한다(`50-api-cloud.mdc`의 실패 처리 규칙 준수).
- 이 기능은 PR #2(`feat: add official exchange rate lookup`)와 PR #3(`fix: use runtime-safe imports for Vercel functions`)에서 구현·안정화되었다.



#### CSV 내보내기

`src/features/export-transactions-csv`가 거래기록을 CSV로 변환한다.

- `escapeCsvField.ts`가 RFC 4180 규칙(쉼표/줄바꿈/쌍따옴표 포함 시 quoting)과 CSV Injection 방지(`=`, `+`, `-`, `@`로 시작하면 `'` prefix)를 함께 처리한다.
- `createTransactionsCsvBlob.ts`가 UTF-8 BOM을 포함해 Excel에서 한글이 깨지지 않도록 한다.
- Transaction 유니온의 각 레코드 타입(환전/해외송금/상담)에 대해 해당하지 않는 계산 컬럼은 빈 셀로 채운다(`mapTransactionToRow.ts`).



#### Supabase 클라우드 동기화

- 로그인 UI 없이 Supabase Auth의 익명 로그인(`signInAnonymously`)만 사용한다(`features/add-transaction/lib/supabaseAuth.ts`).
- `transactions` 테이블은 `record_type`으로 환전/해외송금/상담을 구분하고, 각 종류에 필요하지 않은 계산 컬럼은 DB CHECK 제약으로 반드시 `null`이 되도록 강제한다(`docs/supabase-schema.sql`).
- RLS 정책은 `authenticated` role + `auth.uid() = user_id` 조건의 select/insert/delete만 존재하며, 공개 `anon` 정책은 없다.
- localStorage가 항상 동기적 source of truth이고, Supabase 반영은 best-effort다. 추가 실패는 pending add로, 삭제 실패는 tombstone으로 로컬에 기록해 다음 동기화(`syncNow`)에서 재시도한다(`features/add-transaction/lib/pendingSyncStore.ts`).
- 기존 exchange 전용 테이블에서 3종 레코드 지원으로 확장할 때는 `docs/supabase-migration-required-records.sql`(idempotent, 트랜잭션으로 감싸짐)을 사용한다.



#### Vercel 배포

`api/` 폴더의 파일들은 **Vercel Function** 규약(`GET`/`POST`/`PUT`/`DELETE`를 named export)을 따르므로, 별도의 `vercel.json` 설정 없이(zero-config) 저장소를 Vercel에 연결하면 자동으로 서버리스 함수로 인식된다. `main` 브랜치 병합 시 프로덕션에, PR에는 Preview 배포가 자동으로 생성된다. 현재 배포 서비스: [https://kb-fx-helper-orcin.vercel.app](https://kb-fx-helper-orcin.vercel.app)

### 5.3 실제 코드 구조 요약


| Layer    | 슬라이스 수 | 대표 경로                                                                                                                                   |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| entities | 4      | `src/entities/{currency,rate,remittance,transaction}`                                                                                   |
| features | 6      | `src/features/{calculate-exchange,calculate-remittance,add-transaction,search-transaction,export-transactions-csv,load-exchange-rates}` |
| widgets  | 3      | `src/widgets/{exchange-panel,remittance-panel,transaction-history-panel}`                                                               |
| pages    | 1      | `src/pages/dashboard`                                                                                                                   |
| api (서버) | 1      | `api/exchange-rates.ts` + `api/lib/{fetchEximRates,kstDate,parseEximRates}.ts`                                                          |


---



## 6. AI 협업 Workflow 실행 기록



### 6.1 Plan → 기본 Agent → Ask 3단계 적용

이 프로젝트는 Cursor의 **Plan**(계획) → **기본 Agent**(구현) → **Ask**(리뷰) 3단계로 작업 방식을 분리해 사용했다(`[docs/CUSTOM_MODES.md](docs/CUSTOM_MODES.md)`).


| 단계  | 방식                               | 파일 변경      | 이번 문서 작업(README/REPORT)에서의 실제 사례                                                                                                      |
| --- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 계획  | Plan (filesystem MCP 미사용)        | 금지         | 저장소 조사(README/package.json/.env.example/docs 5종/.cursor/rules 6종/PR 이력/테스트 현황) 후 README/REPORT 목차와 반영 항목을 문서화하고, 사용자 승인 후에만 다음 단계로 진행 |
| 구현  | 기본 Agent (filesystem + context7) | 승인 범위 내 허용 | 승인된 계획대로 `README.md`, `REPORT.md` 두 파일만 작성·수정. `src/**`, `api/**`, `package.json`, `.cursor/**`, `docs/ARCHITECTURE.md` 등은 변경하지 않음    |
| 리뷰  | Ask                              | 금지         | Ask 단계에서 문서의 사실성·링크 유효성·명령어 정확성을 코드 변경 없이 검토하고, PR 생성 시 CodeRabbit이 자동 리뷰를 수행한다                                                       |




### 6.2 Cursor Rules(`.cursor/rules/*.mdc`) 적용 예시


| 규칙 파일                 | 핵심 내용                                     | 실제 코드 반영 예시                                                                                                            |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `00-architecture.mdc` | FSD 레이어 의존 방향, public API 강제              | `scripts/check-architecture.mjs`가 CI에서 자동 검사                                                                           |
| `10-domain-fx.mdc`    | 순수 함수, JPY 100단위 처리, 반올림 순서               | `entities/rate/lib/applyExchangeRate.ts`가 스프레드·우대율 적용 후 소수 둘째자리 반올림, `exchangeToKRW.ts`가 통화 단위(`unit`)로 나눈 뒤 최종 정수 반올림 |
| `20-ui.mdc`           | 함수형 컴포넌트, 한국어 UI, 다크모드                    | `widgets/*` 컴포넌트가 Tailwind `dark:` 변형과 한국어 안내 문구를 사용                                                                   |
| `30-testing.mdc`      | TDD, 경계값 테스트                              | `*.test.ts` 54개 파일이 대상 파일과 동일 위치에 존재, 0/음수/반올림 경계 테스트 포함                                                               |
| `40-security.mdc`     | API 키 미하드코딩, 개인정보 최소수집, CSV Injection 방지  | `EXIM_API_KEY`는 서버 전용 환경변수로만 사용, `escapeCsvField.ts`가 `=+-@` 이스케이프 구현                                                  |
| `50-api-cloud.mdc`    | 외부 API는 Vercel Function 경유, 실패 시 fallback | `api/exchange-rates.ts`가 프록시 역할, 실패 시 502/504/503 상태코드와 한국어 메시지 반환                                                     |




### 6.3 MCP(filesystem/context7) 활용 및 검증

- 프로젝트 공용 `[.cursor/mcp.json](.cursor/mcp.json)`에 `filesystem`(버전 `@2026.7.4` 고정)과 `context7`(HTTP) 두 서버를 정의했다.
- 검증 결과: filesystem 서버 활성화 시 14개 도구 로드 확인, `list_allowed_directories` 결과가 `kb-fx-helper` 프로젝트 루트로 제한됨을 확인, context7로 API 키 없이 라이브러리 문서 조회 성공(`docs/MCP.md` §1, §6 참고).
- 단계별 정책: Plan/Ask 단계에서는 filesystem을 대화에 추가하지 않고, 구현(기본 Agent) 단계에서만 filesystem + context7을 함께 사용한다.



### 6.4 증빙 캡처 안내

`docs/CUSTOM_MODES.md` §7은 Plan/기본 Agent/Ask 선택 화면, Tools & MCP 연결 화면, `list_allowed_directories` 결과, context7 문서 조회 화면 등 6종의 캡처를 정의한다.

화면 캡처는 과제 필수 제출물은 아니며, MCP·Cursor Workflow를 설명하기 위한 선택 증빙으로 별도 보관하였다. 개인 절대경로와 계정정보 노출 방지를 위해 본 MD 파일에는 삽입하지 않았다.

---



## 7. 테스트 및 품질 검증



### 7.1 Vitest 기반 TDD 전략

`.cursor/rules/30-testing.mdc`에 따라 새로운 계산/도메인 로직은 실패하는 테스트를 먼저 작성한 뒤 구현했다. 경계값(0, 음수, 최대값, 반올림 `.5` 경계 등)을 테스트에 반드시 포함한다.

예시 (`src/entities/rate/lib/applyExchangeRate.ts`가 구현하는 규칙에 대한 경계값 테스트 정책):

```typescript
describe('applyExchangeRate 경계값', () => {
  it('반올림 경계값에서 올바르게 반올림한다', () => {
    // 소수 둘째 자리 반올림 경계 케이스
  })

  it('음수 환율 입력 시 에러를 던진다', () => {
    // validateBaseRate 등에서 사전 검증
  })
})
```



### 7.2 현재 테스트 현황

```text
$ npm run test:run
 Test Files  54 passed (54)
      Tests  502 passed (502)
```



### 7.3 `npm run check` 파이프라인

```text
lint(oxlint) → arch:check(FSD 아키텍처) → typecheck(tsc -b --noEmit) → test:run(Vitest) → build(tsc -b && vite build)
```

로컬 개발 중 커밋 전에 한 번에 실행할 수 있으며, CI에서도 동일한 명령을 실행한다.

### 7.4 GitHub Actions CI 구성

`.github/workflows/ci.yml`은 `pull_request`와 `main` push마다 다음을 수행한다.

- `contents: read`로 `permissions`를 최소화
- 동일 브랜치/PR의 중복 실행을 취소하는 `concurrency` 그룹 설정
- `actions/checkout`에 `persist-credentials: false` 적용(자격증명이 워크스페이스에 남지 않도록)
- Node.js 22 설치 후 `npm ci` → `npm run check` 실행

이 세 가지 보안/효율 설정은 최초 CI 작성 시점에는 없었으나, PR #1에 대한 CodeRabbit 리뷰를 반영해 추가되었다(8장 참고).

---



## 8. 협업 및 코드 리뷰 (GitHub + CodeRabbit)



### 8.1 Git 전략

- `main`을 기준으로 `feat/*`(신규 기능·문서), `fix/*`(버그·운영 장애 수정) 작업 브랜치를 생성한다.
- `main`에는 직접 커밋하지 않고, 항상 Pull Request를 통해 리뷰 후 Squash merge한다.
- PR 본문은 "변경 내용 / 실제 검증" 형식으로 작성해, 무엇을 왜 바꿨는지와 로컬에서 어떻게 검증했는지를 함께 기록한다.



### 8.2 PR #1~#4 실제 이력


| PR  | 제목                                                 | 병합일        | CodeRabbit 리뷰 사이클                            | 리뷰 코멘트 수 |
| --- | -------------------------------------------------- | ---------- | -------------------------------------------- | -------- |
| #1  | feat: 필수 거래기록 및 전체 클라우드 동기화 완성                     | 2026-07-13 | CHANGES_REQUESTED ×2 → APPROVED              | 17       |
| #2  | feat: add official exchange rate lookup            | 2026-07-14 | CHANGES_REQUESTED ×3 → COMMENTED(수정 반영 후 병합) | 15       |
| #3  | fix: use runtime-safe imports for Vercel functions | 2026-07-14 | CHANGES_REQUESTED ×2 → APPROVED              | 3        |
| #4  | feat: add MCP workflow and Cursor agent guidance   | 2026-07-17 | CHANGES_REQUESTED ×2 → APPROVED              | 5        |


4개 PR 모두 병합 완료되었으며, CodeRabbit이 남긴 리뷰 코멘트는 총 40건이다. 모든 PR에서 최소 1회 이상 변경 요청(CHANGES_REQUESTED)을 받았고, 수정 반영 후 재리뷰를 거쳐 병합했다.

### 8.3 CodeRabbit 설정(`.coderabbit.yaml`) 요약

- `profile: assertive`, `request_changes_workflow: true`로 엄격한 리뷰와 변경 요청 워크플로를 활성화했다.
- `path_instructions`로 레이어별 리뷰 관점을 지정했다.
  - `src/entities/**`: 순수 도메인 로직 여부, 경계값 테스트, discriminated union 타입가드
  - `src/features/**`: 동일 레이어 import 금지, public API만 사용, Supabase 오프라인 대응
  - `src/widgets/**`: 계산 로직 중복 금지, 한국어 오류 메시지, 접근성
  - `src/shared/api/**`, `api/**`: 민감 키 노출 금지, 네트워크 실패 처리
  - `**/*.csv`, `src/features/export-transactions-csv/**`: BOM, RFC 4180, CSV Injection
  - `docs/supabase*.sql`: RLS 정책, `authenticated` GRANT, idempotent 마이그레이션



### 8.4 실제 리뷰 → 수정 반영 사례

PR #1에서 CodeRabbit이 `.github/workflows/ci.yml`에 대해 남긴 지적 3건이 실제로 현재 CI 설정에 반영되어 있다.

1. `permissions` **블록 없음** → "GITHUB_TOKEN에 기본(과도한) 권한이 부여됨" 지적 → 현재 `permissions: { contents: read }`로 반영됨.
2. **동시성 제한 없음** → "동일 브랜치/PR 중복 실행이 취소되지 않아 리소스 낭비" 지적 → 현재 `concurrency` 그룹(`cancel-in-progress: true`)으로 반영됨.
3. `persist-credentials` **미설정** → "`npm ci`의 postinstall 스크립트가 자격증명을 탈취할 위험" 지적 → 현재 `actions/checkout`에 `persist-credentials: false`로 반영됨.

이 세 항목은 7.4절에서 확인한 현재 `ci.yml` 설정과 정확히 일치하며, CodeRabbit 리뷰가 실제 코드/설정 변경으로 이어졌음을 보여준다.

---



## 9. 배포 및 인프라



### 9.1 Supabase 스키마·RLS 정책

`docs/supabase-schema.sql`(신규 설치) / `docs/supabase-migration-required-records.sql`(기존 exchange 전용 테이블 확장)이 아래를 정의한다.

- `transactions` 테이블: 공통 필드(`record_type`, `customer_name`, `memo`, `currency_code`, `amount`) + recordType별 계산 필드
- `record_type in ('exchange','remittance','consultation')` CHECK 제약
- recordType별로 어떤 계산 컬럼이 필수/금지인지 DB 레벨 CHECK 제약으로 강제(예: `exchange`는 `krw_amount` 필수·`principal_krw` 등 금지)
- `(user_id, created_at desc)` 복합 인덱스로 목록 조회 커버
- RLS: `authenticated` role + `auth.uid() = user_id` 조건의 select/insert/delete 정책만 존재(공개 `anon` 정책 없음)
- 스크립트 전체가 `begin`/`commit` 트랜잭션으로 감싸여 있고, `drop ... if exists` 후 재생성해 여러 번 실행해도 안전(idempotent)



### 9.2 Vercel Function 프록시 구조

- `api/exchange-rates.ts`가 `GET`으로 한국수출입은행 공식 고시환율 API를 호출해 프록시하고, `POST`/`PUT`/`DELETE`는 405를 반환한다. 이 파일은 Node.js 기반 **Vercel Function**이며, Edge Runtime을 사용하지 않는다.
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`로 CDN 캐시를 활용해 외부 API 호출 빈도를 줄인다.
- `EXIM_API_KEY`는 Vercel 프로젝트 환경변수로만 설정하며, 클라이언트 코드(`VITE_` 접두사)에는 존재하지 않는다.
- 요청 실패 시 timeout은 504, 그 외 실패는 502, API 키 미설정은 503으로 구분해 응답하고, 클라이언트는 마지막 성공 데이터로 fallback한다(`50-api-cloud.mdc`).



### 9.3 배포 후 확인 방법

1. Vercel 대시보드에서 저장소를 Import하고 별도 빌드 설정 없이(zero-config) 배포한다(Framework Preset: Vite). 현재 배포 서비스: [https://kb-fx-helper-orcin.vercel.app](https://kb-fx-helper-orcin.vercel.app)
2. Vercel 프로젝트 설정 → Environment Variables에 `EXIM_API_KEY`를 등록한다.
3. Supabase를 사용하려면 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 Vercel 환경변수로 등록한다.
4. 배포된 URL에서 환전 계산, 한국수출입은행 공식 고시환율 조회, 거래기록 저장(Supabase 동기화 상태 표시)이 정상 동작하는지 확인한다.
5. PR을 생성하면 Vercel이 자동으로 Preview 배포를 생성하므로, 병합 전 Preview에서 먼저 확인할 수 있다.

---



## 10. 회고 및 향후 개선



### 10.1 잘된 점

- FSD 레이어 규칙을 문서(`ARCHITECTURE.md`)와 자동 검사 스크립트(`check-architecture.mjs`) 양쪽으로 강제해, 사람이 매번 확인하지 않아도 위반을 CI에서 즉시 잡을 수 있었다.
- Cursor Rules 6개(`00`~`50`)를 레이어/파일 패턴별로 분리해, AI 코드 생성 시점부터 아키텍처·도메인·보안 규칙이 일관되게 적용됐다.
- CodeRabbit의 `path_instructions`를 레이어별로 세분화해, 리뷰가 일반론이 아니라 이 프로젝트의 실제 규칙(예: entities 순수성, RLS 정책, CSV Injection)을 기준으로 이뤄졌다.
- Supabase 연동을 "localStorage가 항상 source of truth, Supabase는 best-effort 미러링" 구조로 설계해, 네트워크·인증 실패가 핵심 기능을 막지 않도록 했다.



### 10.2 아쉬운 점 / 검증 중 발견한 문서-구현 불일치

- **문서-구현 불일치**: `docs/ARCHITECTURE.md` 8장의 상태 표는 Vercel/실시간 환율 항목을 아직 "미착수"로 표기하고 있으나, 실제로는 PR #2(`feat: add official exchange rate lookup`)와 PR #3(`fix: use runtime-safe imports for Vercel functions`)에서 이미 구현이 완료되어 있다(`api/exchange-rates.ts`, `features/load-exchange-rates` 및 관련 테스트로 확인). 이번 문서 작업 범위(README/REPORT)에서는 `ARCHITECTURE.md`를 수정하지 않기로 했으므로, 향후 별도 작업에서 8장 상태 표를 "구현 완료"로 갱신할 필요가 있다.
- 거래기록에 수정(update) 기능이 없어(PRD 범위 밖), Supabase RLS 정책에도 update 정책이 없다. 실제 업무에서는 오탈자 수정 요구가 있을 수 있어 향후 검토가 필요하다.
- 화면 캡처는 과제 필수 제출물이 아니므로 선택 증빙으로 별도 보관했으며, 개인 절대경로·계정정보 노출 방지를 위해 이 문서에는 삽입하지 않았다(6.4절 참고).



### 10.3 향후 확장 아이디어

- 거래기록 수정/취소 기능과 이에 대응하는 RLS update 정책 추가
- 여러 통화의 환율을 한 번에 조회해 비교하는 대시보드 뷰
- 창구 직원별 통계(일별 처리 건수, 환종별 비율) 리포트 기능
- `docs/ARCHITECTURE.md` 8장 상태 표를 실제 구현 상태와 동기화하는 문서 정비 작업

---



## 11. 부록



### 11.1 실행 명령 모음

```bash
npm install              # 의존성 설치
cp .env.example .env.local  # Supabase·공식 환율 API 사용 시에만
npm run dev               # 개발 서버 — 프런트엔드 전용
npx vercel dev             # 개발 서버 + Vercel Function(/api) 포함 전체 기능
npm run build             # 타입체크 + 프로덕션 빌드
npm run test:run          # 테스트 1회 실행
npm run test:watch        # 테스트 watch 모드
npm run lint               # oxlint
npm run arch:check        # FSD 아키텍처 자동 검사
npm run typecheck         # 타입 오류만 검사
npm run check              # lint → arch:check → typecheck → test:run → build 일괄 실행
```



### 11.2 참고 문서 링크

- `[README.md](README.md)` — 프로젝트 소개, 설치·실행, 환경변수
- `[docs/PRD.md](docs/PRD.md)` — 요구사항 정의서
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` — FSD 아키텍처, 도메인 설계
- `[docs/WORKFLOW.md](docs/WORKFLOW.md)` — AI 협업 Workflow, Git/테스트/배포 전략
- `[docs/MCP.md](docs/MCP.md)` — MCP 서버 설정·검증·트러블슈팅
- `[docs/CUSTOM_MODES.md](docs/CUSTOM_MODES.md)` — Plan/기본 Agent/Ask 작업 방식 가이드
- `[docs/supabase-schema.sql](docs/supabase-schema.sql)` — Supabase 테이블/RLS 정의
- `[docs/supabase-migration-required-records.sql](docs/supabase-migration-required-records.sql)` — 기존 테이블 마이그레이션
- `[.coderabbit.yaml](.coderabbit.yaml)` — CodeRabbit 리뷰 설정
- `[.github/workflows/ci.yml](.github/workflows/ci.yml)` — GitHub Actions CI 설정



### 11.3 증빙 캡처 목록 (`docs/CUSTOM_MODES.md` §7 인용)


| #   | 증빙 항목                         | 구분    |
| --- | ----------------------------- | ----- |
| 1   | Plan 선택 화면                    | 선택 증빙 |
| 2   | 기본 Agent 구현 화면                | 선택 증빙 |
| 3   | Ask 선택 화면                     | 선택 증빙 |
| 4   | Tools & MCP 연결(Enabled) 화면    | 선택 증빙 |
| 5   | `list_allowed_directories` 결과 | 선택 증빙 |
| 6   | context7 문서 조회 성공 화면          | 선택 증빙 |


화면 캡처는 과제 필수 제출물은 아니며, MCP·Cursor Workflow를 설명하기 위한 선택 증빙으로 별도 보관하였다. 개인 절대경로와 계정정보 노출 방지를 위해 본 MD 파일에는 삽입하지 않았다.
