# Workflow

> 외환 창구 업무 도우미 (KB FX Helper)

## 문서 개요

이 문서는 이 프로젝트의 **AI 협업 Workflow**를 정의한다. 리서치(NotebookLM, Genspark)부터 구현(Cursor, MCP), 협업(GitHub, CodeRabbit), 검증(Vitest), 배포(Vercel, Supabase)까지 이어지는 전체 도구 체인을 다룬다. 이 문서는 `PRD.md`, `ARCHITECTURE.md`, `README.md`, `REPORT.md`에서 그대로 인용되는 것을 전제로 작성했다.

## 한눈에 보는 AI 협업 Workflow

```mermaid
flowchart LR
    subgraph R["1. 리서치"]
        NLM(NotebookLM)
        GS(Genspark)
    end
    subgraph B["2. 구현 · Cursor"]
        RULE(Cursor Rules)
        MCP(MCP)
        DEV(AI 페어코딩)
    end
    subgraph C["3. 협업 · GitHub"]
        GH(Pull Request)
        CRB(CodeRabbit)
        VT(Vitest · CI)
        RV(Review)
        MG(Merge)
    end
    subgraph D["4. 배포"]
        VC(Vercel)
        SB(Supabase)
    end

    NLM --> GS --> RULE
    MCP -.제공.-> DEV
    RULE --> DEV --> GH
    GH --> CRB --> RV
    GH --> VT --> RV
    RV --> MG --> VC
    MG --> SB
```

| 단계 | 도구 | 역할 | 산출물 |
|---|---|---|---|
| 1. 리서치 | **NotebookLM** | 외환·환율 도메인 자료를 업로드해 학습·요약, PRD 작성 전 배경지식 확보 | 도메인 요약 노트 |
| 1. 리서치 | **Genspark** | 유사 서비스 조사, 문서 초안(PRD/README) 생성 보조 | PRD/README 초안 |
| 2. 구현 | **Cursor** | `.cursor/rules/*.mdc` 기반 AI 페어 프로그래밍으로 FSD 레이어별 코드 작성 | 소스 코드(entities~app) |
| 2. 구현 | **MCP** | 외부 문서·서비스(Supabase 스키마 등) 컨텍스트를 Cursor에 연결 | Cursor 내 실시간 컨텍스트 |
| 3. 협업 | **GitHub** | feature 브랜치/PR로 변경 공유, Actions로 CI 실행 | Pull Request |
| 3. 협업 | **CodeRabbit** | PR에 대한 AI 자동 코드 리뷰(FSD 위반, 규칙 위반 탐지) | 리뷰 코멘트 |
| 3. 협업 | **Vitest** | TDD 기반 단위 테스트, CI에서 자동 실행 | 테스트 리포트 |
| 4. 배포 | **Vercel** | main 병합 시 프론트엔드 자동 배포 | 배포된 웹 앱 |
| 4. 배포 | **Supabase** | 거래기록 저장용 클라우드 DB(Postgres) + RLS | 클라우드 데이터 저장소 |

## 목차

1. [프로젝트 시작](#1-프로젝트-시작)
2. [개발 준비](#2-개발-준비)
3. [구현 순서](#3-구현-순서)
4. [AI 협업 Workflow](#4-ai-협업-workflow)
5. [Git 전략](#5-git-전략)
6. [테스트 전략](#6-테스트-전략)
7. [배포](#7-배포)
8. [완료 기준](#8-완료-기준)

---

## 1. 프로젝트 시작

- **요구사항 분석(PRD)**: NotebookLM으로 외환 창구 업무 도메인 자료를 학습·요약하고, Genspark로 유사 서비스와 요구사항 초안을 조사한 뒤 `PRD.md`로 정리한다.
- **Architecture 설계**: PRD를 기반으로 FSD 레이어, 의존 규칙, 도메인 설계를 `ARCHITECTURE.md`로 문서화한다.
- **Cursor Rules 작성**: PRD·ARCHITECTURE에서 도출한 규칙을 `.cursor/rules/*.mdc`로 코드화하여, 이후 모든 구현 단계에서 Cursor가 자동으로 규칙을 강제하도록 한다.

## 2. 개발 준비

| 항목 | 내용 |
|---|---|
| React | UI 라이브러리. 함수형 컴포넌트 + Hooks만 사용 |
| Tailwind CSS v4 | 유틸리티 클래스 기반 스타일링, 별도 CSS 파일 최소화 |
| FSD | `entities/shared/features/widgets/pages/app` 레이어 구조, 폴더가 곧 의존 규칙 |
| Git | `main` 단일 보호 브랜치 + `feature/*` 작업 브랜치 |

> 위 4가지는 `.cursor/rules/00-architecture.mdc`, `20-ui.mdc`에 규칙으로 등록되어 있으며, MCP는 개발 중 필요한 외부 컨텍스트(문서, 스키마 등)를 Cursor에 실시간으로 연결하는 역할을 한다.

## 3. 구현 순서

```mermaid
graph LR
    E["1. entities"] --> S["2. shared"] --> F["3. features"] --> W["4. widgets"] --> P["5. pages"] --> A["6. app"]
```

> 참고: 이 순서는 **구현(작성) 순서**이며, `ARCHITECTURE.md` 3장의 **의존 방향**(`app → pages → widgets → features → entities → shared`, 상위가 하위를 사용)과는 반대다. 도메인 모델(entities)을 먼저 확정해야 이후 레이어의 계약이 안정되기 때문에, 구현은 아래에서 시작해 위로 쌓아 올린다.

| 순서 | 레이어 | 구현 내용 | 이유 |
|---|---|---|---|
| 1 | entities | 도메인 모델(Currency, Rate, Transaction)과 순수 계산 규칙 | 핵심 개념을 가장 먼저 확정해야 이후 레이어의 계약이 안정된다 |
| 2 | shared | entities가 실제로 필요로 하는 공용 유틸(반올림, 포맷)·API/lib | 필요한 만큼만 최소로 만들어 과잉 설계(speculative generality)를 방지한다 |
| 3 | features | `calculate-exchange`, `add-transaction` 등 유스케이스 | entities+shared가 준비된 뒤 비즈니스 로직을 조립한다 |
| 4 | widgets | `exchange-panel`, `transaction-history-panel` 등 UI 블록 | feature/entity 조합이 끝난 뒤 화면 블록을 구성한다 |
| 5 | pages | `dashboard` 등 라우트 단위 화면 | widgets가 완성되어야 페이지에 배치할 수 있다 |
| 6 | app | 진입점, 전역 Provider, 라우팅 설정 | 모든 레이어가 준비된 뒤 앱을 최종 조립·부팅한다 |

## 4. AI 협업 Workflow

```mermaid
flowchart TD
    Cursor[Cursor] --> GitHub[GitHub] --> CodeRabbit[CodeRabbit] --> Vitest[Vitest] --> Review[Review] --> Merge[Merge]
```

- **Cursor**: Cursor Rules + MCP 컨텍스트로 코드를 생성/수정한다.
- **GitHub**: 변경 사항을 `feature/*` 브랜치에서 Pull Request로 올린다.
- **CodeRabbit**: PR 생성 즉시 AI가 FSD 규칙 위반, public API 우회 등을 1차 리뷰한다.
- **Vitest**: CI에서 단위/회귀 테스트를 자동 실행한다.
- **Review**: CodeRabbit 코멘트 반영 여부와 로직을 팀원이 최종 확인한다.
- **Merge**: 리뷰 승인 + CI 통과 후 `main`에 병합한다.

전체 도구 체인(NotebookLM~Supabase/Vercel)에서의 위치는 상단 [한눈에 보는 AI 협업 Workflow](#한눈에-보는-ai-협업-workflow) 표를 참고한다.

## 5. Git 전략

| 단계 | 설명 | 규칙 |
|---|---|---|
| 1. feature 브랜치 | 작업 단위로 브랜치 생성 | `feature/기능명`, `fix/버그명` 접두사 사용, `main` 직접 커밋 금지 |
| 2. Pull Request | 작업 완료 후 PR 생성 | 변경 목적과 8장 DoD 체크리스트를 PR 본문에 기재 |
| 3. Review | CodeRabbit(AI) + 팀원 리뷰 | FSD 위반, 규칙 위반, 테스트 누락 여부 확인 |
| 4. Merge | 승인 + CI(Vitest/Build) 통과 후 병합 | Squash merge, 병합 후 브랜치 삭제 |

## 6. 테스트 전략

```mermaid
flowchart LR
    Red["Red\n실패하는 테스트 작성"] --> Green["Green\n최소 구현으로 통과"] --> Refactor["Refactor\n중복 제거·구조 개선"] --> Red
```

| 테스트 종류 | 목적 | 도구 | 실행 시점 |
|---|---|---|---|
| TDD | 구현 전 실패하는 테스트로 요구사항을 명세 | Vitest | 새 도메인/계산 로직 작성 전 |
| 단위 테스트 | 순수 함수(계산, 검증)와 경계값 검증 | Vitest | 로컬 개발 중, PR 생성 전 |
| Regression Test | 버그 재현 테스트 추가, 기존 테스트 유지 | Vitest | 버그 수정 시, CI 전체 실행 |
| Build Test | 타입/빌드 오류 확인 | `tsc -b && vite build` | PR 생성 시, CI |

## 7. 배포

```mermaid
graph TD
    GH["GitHub (main)"] -->|자동 배포| VC["Vercel\n프론트엔드"]
    VC -->|데이터 CRUD| SB[("Supabase\nPostgres + RLS")]
```

| 대상 | 설정 항목 | 값/내용 | 트리거 |
|---|---|---|---|
| Vercel | 배포 대상 | 프론트엔드(React+Vite 빌드 결과물) | `main` 병합 시 자동 배포, PR은 Preview 배포 |
| Vercel | 환경변수 | API Key 등 민감 정보는 Vercel Function 환경변수로 격리 | 배포 시 주입 |
| Supabase | 배포 대상 | 거래기록 테이블(Postgres) | 스키마 마이그레이션 시 |
| Supabase | 보안 | RLS(Row Level Security)로 접근 제한 | 테이블 생성 시 설정 |

## 8. 완료 기준

**Definition of Done**

| 구분 | 조건 | 확인 |
|---|---|---|
| 기능 | PRD의 필수 기능이 모두 동작 | [ ] |
| 아키텍처 | FSD 레이어/의존 규칙 위반 없음(CodeRabbit·리뷰로 확인) | [ ] |
| 테스트 | 신규/변경 로직에 대한 Vitest 테스트 작성 및 통과 | [ ] |
| 회귀 | 기존 테스트 전체 통과(회귀 없음) | [ ] |
| 빌드 | `tsc -b && vite build` 오류 없이 성공 | [ ] |
| 리뷰 | CodeRabbit 코멘트 반영 + 팀원 승인(Approve) | [ ] |
| 배포 | Vercel Preview에서 정상 동작 확인 | [ ] |
| 문서 | 필요 시 PRD/ARCHITECTURE/README 갱신 | [ ] |
