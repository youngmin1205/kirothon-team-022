# MCP · Powers · Skills 가이드 (2-4)

> 목표: 대회 전에 **자주 쓸 연동을 미리 설치**해 당일 바로 쓰게 한다.
> 설정 파일(`mcp.json`)은 **repo 공유**, **토큰은 각자 PC 환경변수**.

---

## 0. 개념 정리

| 개념 | 성격 | 로딩 방식 |
|---|---|---|
| **MCP** | 외부 도구/데이터 소스 연결 표준 | 활성화 시 **전부 로드** → 컨텍스트 많이 차지 |
| **Power** | 문서 + 워크플로우(steering) + (선택)MCP를 묶은 패키지 | **필요할 때 동적 로드** → 컨텍스트 절약 |
| **Skill** | 특정 작업 수행 지침 묶음 | 필요 시 활성화 |

> 연동이 많으면 **MCP보다 Power가 토큰 효율적**. 꼭 필요한 MCP만 켜고 나머지는 Power로.

---

## 1. 사전 준비물 (uv/uvx)

AWS 공식 MCP 서버는 `uvx`로 실행된다. `uv`가 필요하다.

```bash
# uv 설치 (mac/linux)
curl -LsSf https://astral.sh/uv/install.sh | sh
uvx --version
```
- Windows는 설치 가이드(https://docs.astral.sh/uv/getting-started/installation/) 참고.
- `uvx <package>` 는 별도 install 없이 받아서 실행한다.

---

## 2. 설치된 MCP 서버

### `.kiro/settings/mcp.json` (repo 공유)
```json
{
  "mcpServers": {
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
      "disabled": false
    }
  }
}
```
- **aws-docs**: AWS 공식 문서 검색 MCP. Bedrock·IAM·CLI 문법을 바로 조회해 환각을 줄인다.

### 토큰이 필요한 MCP (각자 PC — 커밋 금지)
GitHub MCP 등 토큰이 필요하면 `mcp.json`에 평문으로 쓰지 말고 **환경변수 참조**로 둔다.
예(GitHub MCP를 추가할 경우):
```json
"github": {
  "command": "uvx",
  "args": ["some-github-mcp@latest"],
  "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" },
  "disabled": false
}
```
→ `GITHUB_TOKEN` 은 셸/`.env` 에만 둔다.

---

## 3. 설정 병합 우선순위
- `~/.kiro/settings/mcp.json` (사용자 전역) < `repo/.kiro/settings/mcp.json` (워크스페이스)
- 기대한 서버가 안 보이면 두 레벨 모두 확인.
- 변경 후에는 MCP 서버 뷰에서 재연결 또는 kiro-cli 재시작.

---

## 4. 동작 확인 (완료 기준)
kiro-cli를 repo에서 실행하고 채팅에서:
- "aws-docs에서 Bedrock Converse API 요청 형식 찾아줘"
→ MCP가 호출되어 문서 기반 답이 오면 OK ✅

문제 시:
- `uvx: command not found` → uv 미설치
- 서버 목록에 없음 → `disabled: true` 거나 경로/오타, 재연결 필요
- 느림 → 첫 실행은 패키지 다운로드로 지연될 수 있음(미리 1회 실행해 캐시)

---

## 5. 추천 추가 후보 (아이디어 확정 후 선택)
- 아이디어가 **웹/크롤링**이면: fetch 계열 MCP
- **DB 연동**이면: 해당 DB MCP
- **디자인→코드**면: Figma 계열 Power
- 공통적으로 과하게 켜지 말 것 — 컨텍스트·크레딧 소모. 당일 쓸 것만.
