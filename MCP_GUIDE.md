# MCP Client 구현 가이드

## 🎯 구현 완료 기능

### ✅ **MCP TypeScript SDK 통합**
- `@modelcontextprotocol/sdk` 사용
- Server-side에서 실제 MCP 서버와 연결
- **Stdio Transport** 지원 (프로세스 기반)
- **HTTP Transport** 지원 (Streamable HTTP + SSE Fallback)

### ✅ **실시간 연결 관리**
- 실제 MCP 서버 연결/해제
- 연결 상태 실시간 모니터링
- 오류 처리 및 재시도 지원

### ✅ **서버 기능 탐지**
- Resources, Tools, Prompts 자동 감지
- 각 서버의 제공 기능 실시간 표시
- 상세 정보 UI에 반영

### ✅ **도구 및 리소스 호출**
- MCP 도구 실행 API 엔드포인트
- 리소스 읽기 API 엔드포인트
- Client-side에서 서버 API 호출

## 🏗️ 아키텍처

```
Frontend (Browser)          Backend (Node.js)
├── UI Components           ├── MCP Client Manager
├── Client Manager          ├── API Routes
│   ├── Event Handling     │   ├── /api/mcp/servers
│   └── API Calls          │   └── /api/mcp/tools
└── State Management       └── Real MCP Connections
                               ├── Stdio Transport
                               └── HTTP Transport
                                   ├── Streamable HTTP
                                   └── SSE Fallback
```

## 📁 주요 파일 구조

```
/lib/
├── mcp-client.ts      # Client-side 연결 관리
└── mcp-server.ts      # Server-side 실제 MCP 연결

/app/api/mcp/
├── servers/route.ts   # 서버 연결 관리 API
└── tools/route.ts     # 도구/리소스 호출 API

/app/servers/
├── page.tsx           # MCP 서버 관리 UI
└── components/
    ├── ServerCard.tsx     # 서버 카드 (연결 정보 표시)
    └── AddServerDialog.tsx # 서버 추가/편집 대화상자

/types/
└── mcp.ts            # MCP 관련 타입 정의
```

## 🚀 사용 방법

### 1. **MCP 서버 추가**
1. `/servers` 페이지에서 "서버 추가" 클릭
2. **전송 방식 선택**:
   - **Stdio (프로세스)**: 명령행 프로세스로 실행되는 MCP 서버
   - **HTTP (웹 서버)**: HTTP API로 제공되는 MCP 서버
3. **Stdio 서버 정보** 입력:
   - 이름: 식별용 이름
   - 명령어: 실행할 명령어 (예: `python`, `node`, `uvx`)
   - 인수: 명령행 인수들
   - 환경변수: 필요한 환경변수
4. **HTTP 서버 정보** 입력:
   - 이름: 식별용 이름
   - URL: MCP 서버 엔드포인트 (예: `http://localhost:3000/mcp`)
   - HTTP 헤더: 인증 헤더 등 (예: `Authorization: Bearer token`)
5. "연결 테스트" 버튼으로 설정 검증
6. "추가" 버튼으로 저장

### 2. **서버 연결**
- 서버 카드의 "연결" 버튼 클릭
- 연결 상태가 실시간으로 업데이트됨
- 연결 성공 시 서버 기능과 리소스 정보 표시

### 3. **연결 정보 확인**
- 서버 카드 우측 화살표로 상세 정보 확장
- **MCP 연결 정보** 섹션에서 확인 가능:
  - 지원 기능 (Resources, Tools, Prompts)
  - 사용 가능한 리소스 목록
  - 사용 가능한 도구 목록
  - 사용 가능한 프롬프트 목록

## 🛠️ 테스트 예시

### Stdio MCP 서버

#### File System Server
```bash
# 설치
uvx mcp-server-filesystem

# 서버 설정
전송 방식: Stdio
명령어: uvx
인수: mcp-server-filesystem
인수: --allowed-directories
인수: /path/to/your/documents
```

#### Git Server
```bash
# 설치
pip install mcp-server-git

# 서버 설정
전송 방식: Stdio
명령어: python
인수: -m
인수: mcp_server_git
환경변수: REPO_PATH=/path/to/git/repo
```

### HTTP MCP 서버

#### Streamable HTTP Server
```bash
# 로컬 HTTP MCP 서버 실행
npx tsx server.ts

# 서버 설정
전송 방식: HTTP
URL: http://localhost:3000/mcp
헤더: Content-Type: application/json
```

#### 인증이 필요한 HTTP 서버
```bash
# 서버 설정
전송 방식: HTTP
URL: https://api.example.com/mcp
헤더: Authorization: Bearer your-api-token
헤더: X-API-Key: your-api-key
```

## 🔧 API 엔드포인트

### POST `/api/mcp/servers`
```json
{
  "action": "connect|disconnect|test",
  "serverId": "server-id",
  "serverConfig": {
    "name": "Server Name",
    "command": "command",
    "args": ["arg1", "arg2"],
    "env": {"VAR": "value"}
  }
}
```

### POST `/api/mcp/tools`
```json
{
  "serverId": "server-id",
  "toolName": "tool-name",
  "args": {"param": "value"}
}
```

### GET `/api/mcp/tools?serverId=...&uri=...`
리소스 읽기용 엔드포인트

## 🎨 UI 특징

- **실시간 상태 표시**: 연결됨/연결 중/오류/연결 안됨
- **기능별 배지**: Resources, Tools, Prompts 지원 여부 표시
- **상세 정보 카드**: 각 서버의 제공 기능 상세 표시
- **오류 메시지**: 연결 실패 시 구체적인 오류 정보 제공

## 🔄 실시간 업데이트

- 연결 상태 변화 즉시 반영
- 서버 기능 정보 자동 새로고침
- Event-driven 아키텍처로 성능 최적화

## 📦 의존성

```json
{
  "@modelcontextprotocol/sdk": "1.18.2",
  "@radix-ui/react-dialog": "1.1.15",
  "@radix-ui/react-label": "2.1.1"
}
```

## 🎉 완성!

MCP Client 구현이 완료되어 실제 MCP 서버와의 연결, 도구 호출, 리소스 접근이 모두 가능합니다. TypeScript SDK를 사용하여 안정적이고 확장 가능한 구조로 구현했습니다.
