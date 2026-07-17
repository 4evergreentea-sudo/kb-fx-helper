# MCP 설정 가이드

> 외환 창구 업무 도우미 (KB FX Helper)

## 문서 개요

이 문서는 팀 공용 MCP 설정([`.cursor/mcp.json`](../.cursor/mcp.json))의 온보딩, 연결 확인, 보안, 트러블슈팅을 다룬다.

## 목차

1. [구성 요약](#1-구성-요약)
2. [팀 온보딩](#2-팀-온보딩)
3. [Context7 선택적 API 키](#3-context7-선택적-api-키)
4. [Windows 대체 설정](#4-windows-대체-설정)
5. [연결 확인](#5-연결-확인)
6. [filesystem 접근 범위 검증](#6-filesystem-접근-범위-검증)
7. [context7 사용 예시](#7-context7-사용-예시)
8. [트러블슈팅](#8-트러블슈팅)
9. [보안 체크리스트](#9-보안-체크리스트)

---

## 1. 구성 요약

프로젝트 루트의 [`.cursor/mcp.json`](../.cursor/mcp.json)에 두 MCP 서버가 정의되어 있다.

| 서버 | 운송 | 역할 |
|---|---|---|
| `filesystem` | stdio (`npx`) | 프로젝트 루트(`${workspaceFolder}`) 내 파일 읽기·쓰기 |
| `context7` | HTTP (`https://mcp.context7.com/mcp`) | 라이브러리·프레임워크 최신 문서 조회 |

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${workspaceFolder}"
      ]
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

### 설계 원칙

- **context7 API 키는 공용 설정의 필수 조건이 아니다.** 커밋되는 `mcp.json`에 `headers`나 `CONTEXT7_API_KEY`를 포함하지 않는다.
- **절대 개인 경로를 하드코딩하지 않는다.** filesystem 루트는 `${workspaceFolder}`만 사용한다.
- **앱용 `.env.local`은 Cursor MCP에서 자동 로드되지 않는다.** Vite/Supabase용 환경변수와 Cursor MCP 환경변수는 별도로 관리한다.

---

## 2. 팀 온보딩

1. 저장소를 clone하고 `kb-fx-helper` 디렉터리를 Cursor에서 워크스페이스 루트로 연다.
2. [`.cursor/mcp.json`](../.cursor/mcp.json)이 존재하는지 확인한다.
3. Node.js 18 이상이 설치되어 있는지 확인한다 (`filesystem` 서버가 `npx`로 실행됨).
4. Command Palette → `Developer: Reload Window`로 MCP 설정을 반영한다.
5. **Settings → Tools & MCP** (또는 Customize 사이드바)에서 `filesystem`, `context7` 서버가 Enabled인지 확인한다.
6. 작업 단계별 MCP 사용 정책은 [`CUSTOM_MODES.md`](CUSTOM_MODES.md)를 따른다.

> 프로젝트 수준 `.cursor/mcp.json`과 개인 `~/.cursor/mcp.json`이 함께 적용될 수 있다. 병합 방식과 동일 서버 이름의 우선순위는 **Cursor 버전에 따라 달라질 수 있으므로**, 동일 서버 이름이 한쪽 설정을 덮어쓴다고 가정하지 않는다. 적용 결과는 **Settings → Tools & MCP**에서 확인한다. 공용 프로젝트 설정은 API 키 없이 사용하며, 선택 API 키가 필요하면 Context7 공식 설정 또는 사용자 수준 설정 후 실제 연결 결과를 검증한다.

---

## 3. Context7 선택적 API 키

API 키 없이도 context7에 연결하고 문서를 조회할 수 있다. 다만 rate limit이 적용될 수 있다.

키가 필요한 경우 **개인 환경**에서 아래 두 단계를 **한 세트**로 설정한다. 실제 키나 빈 placeholder는 저장소에 커밋하지 않는다.

> OS 환경변수만 설정하고 MCP 설정(`~/.cursor/mcp.json`)에서 `${env:CONTEXT7_API_KEY}`로 참조하지 않으면, API 키가 context7 MCP에 전달되지 않는다.

### 1단계: 사용자 수준 `~/.cursor/mcp.json`

Context7 공식 설정을 참고하여, 개인 `~/.cursor/mcp.json`에 API 키 헤더를 추가한다. `headers.CONTEXT7_API_KEY`에는 실제 키 값이 아니라 `${env:CONTEXT7_API_KEY}` 보간을 지정한다. 프로젝트·사용자 설정이 병합되는 방식은 Cursor 버전에 따라 다를 수 있으므로, 저장 후 **Settings → Tools & MCP**에서 context7 연결 상태를 확인한다.

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}"
      }
    }
  }
}
```

### 2단계: OS 환경변수에 실제 키 값 설정

1단계와 함께, OS 환경변수에 실제 API 키 값을 설정한다.

macOS/Linux (zsh 예시):

```bash
export CONTEXT7_API_KEY="your-key-here"
```

Windows (PowerShell 예시):

```powershell
$env:CONTEXT7_API_KEY = "your-key-here"
```

환경변수 설정 후 Cursor를 재시작하고, **Settings → Tools & MCP**에서 context7 연결·문서 조회가 정상인지 검증한다.

### 키 발급

[context7.com/dashboard](https://context7.com/dashboard)에서 무료 API 키를 발급할 수 있다.

> `.env.example`이나 `.env.local`에 `CONTEXT7_API_KEY`를 넣어도 Cursor MCP가 자동으로 읽지 않는다. 앱용 env 파일과 MCP env는 분리한다.

---

## 4. Windows 대체 설정

macOS/Linux 공용 `mcp.json`은 `command: "npx"`를 사용한다. Windows에서 `filesystem` 서버가 시작되지 않으면 **개인 환경**에서 아래 형태로 대체할 수 있다.

```json
"filesystem": {
  "type": "stdio",
  "command": "cmd",
  "args": [
    "/c",
    "npx",
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "${workspaceFolder}"
  ]
}
```

이 대체 설정은 `~/.cursor/mcp.json`에 개인적으로 적용하거나, 팀 합의 후 프로젝트 `mcp.json`을 Windows 전용 브랜치 없이 공유할 방법을 별도 논의한다. **저장소에 `/Users/...` 같은 절대 경로를 추가하지 않는다.**

---

## 5. 연결 확인

| 단계 | 방법 | 기대 결과 |
|---|---|---|
| 1 | `Developer: Reload Window` | MCP 설정 재로드 |
| 2 | Settings → Tools & MCP | `filesystem`, `context7` 표시 및 Enabled |
| 3 | Output 패널 → `MCP Logs` | 초기화 오류 없음 |
| 4 | Agent 채팅 Available Tools | MCP 도구 목록 표시 |

### 증빙

최종 보고서용으로 Tools & MCP 연결 화면 스크린샷을 저장한다. 자세한 목록은 [`CUSTOM_MODES.md` §증빙](CUSTOM_MODES.md#증빙-캡처-목록)을 참고한다.

---

## 6. filesystem 접근 범위 검증

### `list_allowed_directories` 확인

구현 단계(기본 Agent)에서 filesystem MCP의 `list_allowed_directories` 도구를 호출한다.

**기대 결과:** 반환 경로가 현재 `kb-fx-helper` 프로젝트 루트의 **실제 절대경로**와 일치한다. 문서에는 개인 절대경로를 기록하지 않는다.

**확인 방법:**

- 반환 경로가 `.../kb-fx-helper`로 끝나는지 확인한다.
- macOS/iCloud 환경에서는 한글 경로가 NFC·NFD 두 형태로 표시될 수 있으나, 동일 디렉터리를 가리킨다.

### `${workspaceFolder}` 확장 확인

- 반환 경로에 리터럴 문자열 `${workspaceFolder}`가 그대로 나오면 **확장 실패**다.
- 이 경우 `mcp.json`의 filesystem args 마지막 인자를 `"."`로 바꾼 뒤 Reload Window → `list_allowed_directories`를 다시 호출한다.
- `"."` 대안은 Cursor가 워크스페이스 루트에서 MCP를 실행할 때만 유효하다. 반드시 실제 연결 테스트로 확인한다.

### 프로젝트 외 경로 접근 거부 (negative test)

Agent에게 프로젝트 외부 경로(예: 홈 디렉터리의 임의 파일) 읽기를 요청한다.

**기대 결과:** 접근 거부 또는 "allowed directories" 범위 밖 오류.

### filesystem 도구 종류

filesystem MCP는 읽기뿐 아니라 변경 도구도 제공한다.

| 유형 | 도구 예시 |
|---|---|
| 읽기 | `read_text_file`, `read_media_file`, `read_multiple_files`, `list_directory`, `search_files`, `get_file_info`, `list_allowed_directories` |
| 쓰기·변경 | `write_file`, `edit_file`, `move_file`, `create_directory` |

### 작업 단계별 MCP 사용 정책

| 단계 | Cursor 방식 | filesystem | context7 |
|---|---|---|---|
| 계획 | Plan | 대화에 **추가하지 않음** | **추가** |
| 구현 | 기본 Agent | **추가** | **추가** |
| 리뷰 | Ask | 대화에 **추가하지 않음** | 필요 시 **추가** |

계획·리뷰 단계에서는 MCP Servers 메뉴에서 filesystem을 선택하지 않는다. 자세한 정책은 [`CUSTOM_MODES.md`](CUSTOM_MODES.md)를 참고한다.

---

## 7. context7 사용 예시

Agent 채팅에서 아래와 같이 요청할 수 있다.

```
Vitest 4의 test API 사용법을 context7로 조회해줘.
```

```
Supabase JS v2에서 RLS가 적용된 insert 패턴을 context7로 확인해줘.
```

```
React 19 use hook 공식 문서를 context7로 조회해줘.
```

**기대 결과:** 최신 문서 스니펫이 반환된다 (API 키 없이도 동작).

---

## 8. 트러블슈팅

| 증상 | 확인 사항 | 조치 |
|---|---|---|
| MCP 서버가 목록에 없음 | `.cursor/mcp.json` 경로·JSON 문법 | 워크스페이스 루트가 `kb-fx-helper`인지 확인, JSON 유효성 검사 |
| filesystem 시작 실패 | Node.js 버전, `npx` 가용성 | Node 18+ 설치, `npx -y @modelcontextprotocol/server-filesystem --help` 실행 |
| context7 연결 실패 | 네트워크, MCP Logs | 방화벽·프록시 확인, Output → MCP Logs 오류 메시지 확인 |
| rate limit | context7 API 키 미설정 | §3의 선택적 API 키 설정 |
| 허용 경로가 프로젝트 루트가 아님 | `list_allowed_directories` 결과 | `${workspaceFolder}` 확장 여부 확인, 필요 시 `"."` 대안 테스트 |
| 변경이 반영되지 않음 | 캐시 | `Developer: Reload Window` 또는 Cursor 재시작 |

---

## 9. 보안 체크리스트

커밋 전 아래 항목을 확인한다.

- [ ] `mcp.json`에 실제 API 키·토큰이 없다
- [ ] `mcp.json`에 `/Users/...` 등 개인 절대 경로가 없다
- [ ] 빈 placeholder(`CONTEXT7_API_KEY=`)를 저장소에 커밋하지 않았다
- [ ] `.env.local`이 Cursor MCP에 자동 적용된다고 가정하지 않았다
- [ ] `mcp.json` 변경은 PR에서 인프라 변경과 동일하게 리뷰한다
- [ ] 계획·리뷰 단계(Plan·Ask)에서 filesystem MCP를 대화에 추가하지 않았다 ([`CUSTOM_MODES.md`](CUSTOM_MODES.md))
- [ ] `list_allowed_directories`로 접근 범위가 프로젝트 루트로 제한됨을 확인했다

### 검색 명령 예시

설정 파일 검사와 문서 변경 검토를 분리한다.

```bash
# 설정 파일 자체 검사 (기대 결과: 출력 없음)
rg -n '/Users/|[A-Za-z]:\\Users\\|CONTEXT7_API_KEY|your-key-here' .cursor/mcp.json

# 문서·설정 변경 검토
git diff -- .cursor/mcp.json docs/MCP.md docs/CUSTOM_MODES.md docs/WORKFLOW.md
```

---

## 관련 문서

- [`CUSTOM_MODES.md`](CUSTOM_MODES.md) — 작업 단계별 MCP 사용 정책
- [`WORKFLOW.md`](WORKFLOW.md) — AI 협업 전체 흐름
- [`ARCHITECTURE.md`](ARCHITECTURE.md) §7 — AI 협업 전략
