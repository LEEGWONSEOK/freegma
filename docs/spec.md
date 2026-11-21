# freegma 개발 스펙

> 상태: 초안(개정 0) | 작성: 2026-11-19 | 짝 문서: `docs/design.md`(무엇을 만드는가) — 이 문서는 «어떻게 만드는가»
> 한 줄 요약: macOS(Apple Silicon) 전용 Electron 앱. pnpm 모노레포로 «Electron에 묶이지 않는 핵심 로직(core·codegen)»과 «앱 껍데기(desktop)»를 나누고, MCP 서버는 같은 앱 실행 파일을 다른 모드로 띄워 만든다.

## 0. 원칙 (우선순위 순서)
1. **핵심 로직은 Electron 밖에.** 문서 모델·파일 저장·변경 비교·코드 생성은 순수 TypeScript 패키지로 만든다. 앱·MCP·테스트가 같은 코드를 쓴다. Electron API는 `apps/desktop`에서만 부른다.
2. **메인 프로세스는 가볍게.** 무거운 일(파일 파싱·변경 비교·코드 생성)은 워커(utilityProcess)로 보낸다. 메인이 막히면 창 전체가 멈춘다.
3. **Mac 앱답게.** 트랙패드 확대·이동, 메뉴 막대, ⌘ 단축키, 다크 모드, 신호등 버튼이 있는 제목 막대. 웹페이지를 창에 넣은 느낌이 나지 않게.
4. **혼자 + AI가 개발한다.** 구조와 규칙을 단순하게, 테스트는 «AI가 고친 뒤 스스로 확인할 수 있는» 형태(골든 파일·스냅샷)로.
5. **버전은 착수 때 고정.** 아래 버전은 2026-11-19 npm 최신 안정판 기준. 착수 시 `pnpm-lock.yaml`로 고정하고, 올릴 때는 한 번에 하나씩.

## 1. 대상 환경
| 항목 | 결정 | 이유 |
|---|---|---|
| OS | macOS 13(Ventura) 이상 | Electron 지원 범위 안에서 충분히 넓고, 최신 API(로컬 서체 접근 등) 사용 가능 |
| CPU | **arm64(Apple Silicon)만** | 개발·사용 PC가 Apple Silicon. Intel(x64)·Universal 빌드는 2차 |
| 배포 형태 | `.dmg` (앱 1개 + 셸 명령) | Mac 표준. Mac App Store는 샌드박스 때문에 git 실행·임의 폴더 접근이 막혀 제외 |
| Windows·Linux | 1차 범위 밖 | 코드에 Mac 전용 가정을 흩뿌리지 않도록 플랫폼 의존은 `apps/desktop/src/main/platform/` 한 곳에 모은다 |
| 의존하는 외부 프로그램 | `git` 2.30 이상 | Xcode Command Line Tools에 포함. 없으면 시작 화면에서 `xcode-select --install` 안내 |

## 2. 기술 스택
| 영역 | 선택 | 기준 버전 | 메모 |
|---|---|---|---|
| 앱 셸 | Electron | 45.x | design.md 확정 |
| 빌드 도구 | electron-vite + Vite | 6.x / 8.x | main·preload·renderer를 한 설정으로. 호환은 착수 때 확인 |
| 언어 | TypeScript (strict) | 7.x | ESM만 사용 |
| UI | React | 19.x | |
| 앱 UI 스타일 | Tailwind CSS + CSS 변수 | 4.x | 앱 자체 화면(패널·메뉴)용. 디자인 캔버스와 별개 |
| UI 부품 | Radix UI Primitives | 최신 | 메뉴·팝오버·대화상자의 키보드·접근성 처리 |
| 상태 | zustand + immer | 5.x / 11.x | immer patch를 편집 명령(op)으로 그대로 씀(§5) |
| 스키마 | zod | 4.x | 파일 검증 + MCP 도구 정의(`z.toJSONSchema`) + IPC 검증을 한 스키마로 |
| MCP | `@modelcontextprotocol/sdk` | 1.x | stdio 서버 |
| 파일 감시 | @parcel/watcher | 2.x | macOS FSEvents 직접 사용, 큰 폴더에서도 가벼움 |
| 원자적 쓰기 | write-file-atomic | 8.x | |
| id | nanoid | 6.x | 노드 id `n_` + 6자 |
| 가상 목록 | react-virtuoso | 4.x | 레이어 트리·변경 목록 |
| 로그 | electron-log | 5.x | `~/Library/Logs/freegma/` |
| 패키징 | electron-builder | 26.x | dmg, arm64 |
| 단위 테스트 | Vitest | 5.x | core·codegen |
| E2E 테스트 | Playwright(Electron 모드) | 1.x | 앱 띄워서 클릭·저장·커밋 흐름 |
| 린트·포맷 | Biome | 2.x | ESLint+Prettier 대신 하나로, 빠름 |
| 패키지 관리 | pnpm workspaces | 최신 | |
| Node(개발용) | 24 LTS | | `.node-version`으로 고정(지금 PC는 22.2 → 올려야 함) |
| 렌더 대안 | canvaskit-wasm | 0.4x | design.md §8 실측에서 DOM이 못 버틸 때만 |

**고르지 않은 것**
- Tauri: 가볍지만 렌더러가 Safari(WebKit)라 «캔버스에 보이는 것 = Chrome에서 돌아갈 웹 코드»가 어긋날 수 있고, git·MCP·파일 감시를 Rust와 JS 양쪽에 나눠야 한다.
- Swift 네이티브: Mac다움은 최고지만 DOM 렌더(코드와 같은 레이아웃)와 웹 코드 생성 흐름을 다시 만들어야 한다.
- isomorphic-git 등 git 재구현 라이브러리: 사용자 git 설정·훅·서명·인증이 그대로 동작해야 하므로 설치된 git을 실행한다.

## 3. 저장소 구조 (pnpm 모노레포)
```
freegma/
  apps/
    desktop/                     ← Electron 앱 (Electron API는 여기서만)
      src/
        main/                    ← 메인 프로세스
          app.ts                 : 시작, 단일 인스턴스, 창 관리, 모드 분기(§4)
          menu.ts                : 메뉴 막대·단축키
          ipc/                   : IPC 처리(채널별 파일)
          project/               : 프로젝트 열기·닫기, 워커 관리
          git/                   : git 실행 래퍼
          mcp/                   : MCP 서버(stdio 모드) + 앱 중계 소켓
          render/                : 화면 밖 창으로 PNG 만들기(render_image)
          platform/              : macOS 전용 처리(셸 명령 설치, 독, 최근 문서)
        worker/                  ← utilityProcess: 파일 파싱·변경 비교·코드 생성
        preload/                 ← contextBridge로 좁은 API만 노출
        renderer/                ← React 앱
          app/                   : 시작 화면, 편집 화면, 커밋 창
          canvas/                : DOM 캔버스 렌더러, 선택·가이드 오버레이(canvas)
          panels/                : 레이어·속성·토큰·컴포넌트·개발
          system/                : 디자인 시스템 화면(문서 보기·편집 패널, design.md §2-5)
          store/                 : zustand 저장소
      resources/                 ← 아이콘, 엔타이틀먼트, 셸 명령 스크립트
      electron-builder.yml
  packages/
    schema/                      ← zod 스키마: 노드·디자인 시스템(system.json·토큰·글자 스타일·컴포넌트 usage)·spec·project.json, 포맷 버전·변환
    core/                        ← 문서 모델, 편집 명령(op), 되돌리기, 직렬화(안정된 출력), 프로젝트 읽기·쓰기
    diff/                        ← 노드 id 단위 변경 비교, 커밋 메시지 생성(design.md §5-2)
    codegen/                     ← IR + 스펙 어댑터(react-tailwind, react-native …), 스펙 감지
    style/                       ← IR → CSS 스타일 변환. 캔버스 렌더러와 웹 어댑터가 함께 씀(§6)
    mcp-tools/                   ← MCP 도구 정의·처리(앱 중계/직접 쓰기 둘 다에서 씀)
  fixtures/                      ← 테스트용 샘플 freegma/ 프로젝트(골든 파일 포함)
  docs/
  CLAUDE.md                      ← AI 개발용 규칙 요약(§12)
  biome.json  pnpm-workspace.yaml  tsconfig.base.json  .node-version
```
- **의존 방향은 한쪽으로만**: `schema` ← `core` ← `diff`·`codegen`·`style` ← `mcp-tools` ← `apps/desktop`. 거꾸로 import하면 Biome 규칙(또는 dependency-cruiser)으로 막는다.
- `packages/*`는 Node·브라우저 어디서나 돌아야 한다. `fs`가 필요한 부분은 `core/io`에 인터페이스로 두고 구현은 앱에서 넣는다(테스트는 메모리 파일시스템).

## 4. 실행 모드와 프로세스
같은 `freegma.app` 실행 파일이 인자에 따라 세 가지로 뜬다.

| 모드 | 띄우는 방법 | 하는 일 |
|---|---|---|
| 앱 | 독·Finder·`freegma [폴더]` | 일반 창 앱. 단일 인스턴스(두 번째 실행은 떠 있는 앱에 폴더만 넘김) |
| MCP | `freegma mcp --project <폴더>` | 창·독 아이콘 없이 stdio MCP 서버. 앱이 떠 있으면 앱으로 중계, 없으면 직접 파일에 씀 |
| 렌더 | MCP 모드가 `render_image`를 처음 받을 때 내부에서 | 숨긴 창 하나로 PNG 생성 후 대기(재사용) |

- **MCP를 별도 Node 프로그램으로 만들지 않는 이유**: 사용자 PC에 Node가 없어도 되고, `render_image`에 필요한 Chromium 렌더러를 그대로 쓸 수 있다. `ELECTRON_RUN_AS_NODE`는 보안상 꺼 두므로(§9) 메인 프로세스 모드로 띄운다. MCP 모드는 단일 인스턴스 잠금을 건너뛴다.
- **앱 중계**: 앱은 프로젝트마다 유닉스 소켓을 연다 — `~/Library/Application Support/freegma/run/<프로젝트 경로 해시>.sock`, 권한 0600(나만 접근). TCP 포트를 열지 않으므로 다른 사용자·웹페이지가 붙을 수 없다. (design.md §12의 «127.0.0.1 + 무작위 토큰»을 이것으로 바꾼다.)
- **Claude Code 실행**: ✦ AI 탭(design.md §2-6)과 «저장소에서 가져오기» 때 메인 프로세스가 사용자의 `claude` CLI를 자식 프로세스로 띄운다(§9). 그 Claude가 freegma MCP를 부르면 평소처럼 앱 중계 소켓으로 들어온다.
  - **채팅 세션**: `claude -p --input-format stream-json --output-format stream-json --resume <세션 id> --allowedTools "Read,Glob,Grep,mcp__freegma__*"` 를 프로젝트마다 하나 띄워 두고 메시지를 줄 단위 JSON으로 주고받는다(스트리밍 표시: 생각 중 → 쓴 도구 → 답). Claude Agent SDK로 바꿀 수 있게 `main/ai/session.ts` 한 곳에 감싼다. 세션 id와 대화는 `freegma/.cache/chat/`.
  - **맥락 첨부**: 보낼 때 앱이 «대상»(선택 노드 id·이름, 시스템 항목, 도메인)과 답변 id를 메시지 앞에 붙인다. Claude가 그 답변 중에 부르는 MCP 쓰기는 답변 id를 달고 와서 ProjectHost가 op를 한 묶음(`group: <답변 id>`)으로 묶는다 → «이 답변 되돌리기» = 묶음 inverse 적용.
  - 응답이 오래 걸리면 [중지](프로세스에 인터럽트). 앱을 닫으면 세션 프로세스를 정리한다.
- **[✦ 코드에 반영]**(design.md §2-7): 앱은 코드를 쓰지 않는다. macOS 터미널(사용자 기본 터미널 앱)을 `open -a`로 열고, 저장소 루트에서 `claude "<요청문>"`을 대화형으로 실행한다(쓰기 권한 확인은 Claude Code의 평소 방식 그대로). 이 Claude는 사용자의 MCP 등록(`freegma mcp`)으로 `get_handoff`를 부른다. 앱이 띄운 자식 프로세스가 아니므로 ✦ AI 탭의 제한(읽기 + freegma MCP)과 다르다.
- **라우터 감지**(`packages/codegen/router`): `react-router` + 라우터 파일 → `src/pages/<이름>Page.tsx` + 등록, `next` + `app/` → `app/<경로>/page.tsx`, `expo-router` → `app/<경로>.tsx`. 결과는 `spec.json`의 `router`에 저장하고 사람이 고칠 수 있다.
- **셸 명령**: 앱 메뉴 «셸 명령 설치»가 `/usr/local/bin/freegma`(또는 `~/.local/bin`)에 앱 안 스크립트로 링크를 만든다(VS Code의 `code` 방식). MCP 등록은 `claude mcp add freegma -- freegma mcp --project ./freegma`.

**앱 모드 프로세스**
```
메인 프로세스
 ├ 창·메뉴·IPC·git 실행·파일 감시·MCP 중계 소켓
 ├ ProjectHost (프로젝트마다 1개)
 │   └ 문서의 «정본»과 되돌리기 기록을 가진다(§5)
 └ utilityProcess 워커 (프로젝트마다 1개)
     └ 프로젝트 전체 파싱, 변경 비교(HEAD ↔ 지금), 코드 생성, 스펙 감지
렌더러 (창마다 1개)
 └ 문서의 «작업 사본» + 화면. 편집은 즉시 반영하고 op를 메인에 보냄
```

## 5. 문서 모델과 편집 명령 (op)
- **모든 변경은 op(편집 명령)이다.** 사람의 마우스 편집, AI의 MCP 호출, 바깥 파일 변경 반영이 모두 같은 op 형식으로 흐른다.
  ```ts
  type Op = {
    id: string; origin: 'user' | 'ai' | 'disk';
    file: string;              // freegma/ 안 상대 경로 (프레임 파일 단위)
    patches: Patch[];          // immer patch (JSON Patch 꼴)
    inverse: Patch[];          // 되돌리기용
    label: string;             // «간격 변경» — 되돌리기 메뉴·상태줄 표시
    group?: string;            // 같은 묶음은 한 번에 되돌림 (MCP 호출 하나, ✦ AI 답변 하나)
  }
  ```
- **흐름**: 렌더러가 편집 → 작업 사본에 바로 적용(16ms 안 반영) → op를 메인에 보냄 → 메인 ProjectHost가 스키마 검증·순번 부여·정본 적용 → 300ms 모아 파일 저장 → 다른 창·MCP에 알림. MCP 쓰기는 반대로 메인에서 시작해 렌더러로 간다.
- **정본은 메인 하나.** 렌더러와 정본이 어긋나면(검증 실패 등) 메인이 거절하고 렌더러는 그 op를 되돌린다.
- **되돌리기 기록은 메인에.** 그래야 AI 수정도 ⌘Z로 취소된다. `origin`을 남겨 «AI 수정만 취소»도 가능하게 한다(2차 UI).
- **바깥 변경**: 파일 감시가 바뀐 파일을 알리면, 앱이 방금 쓴 파일인지 내용 해시로 확인해 자기 쓰기는 무시한다. 남의 쓰기면 다시 읽어 차이를 `origin: 'disk'` op로 만든다. 브랜치 전환처럼 많은 파일이 한꺼번에 바뀌면 프로젝트를 통째로 다시 읽고 되돌리기 기록을 비운다.
- **직렬화(안정된 출력)**: `core/serialize`가 스키마에 정한 키 순서로 쓴다(사전순이 아니라 «id, type, name, 레이아웃, 스타일, children» 같은 읽기 좋은 순서). 숫자는 소수 둘째 자리 반올림, 기본값 생략, 끝에 줄바꿈 1개. `fixtures/`의 골든 파일로 «읽고 다시 쓰면 바이트가 같다»를 테스트한다.
- **포맷 변환**: `schema/migrations/`에 버전별 변환 함수. 열 때 변환하고 저장 때 새 버전으로 쓴다.

## 6. 캔버스 렌더러 (DOM)
- 노드 → `style` 패키지 → CSS 속성 → React 요소. **웹 코드 생성(React+Tailwind 어댑터)도 같은 `style` 패키지를 거친다.** 그래서 캔버스 화면과 생성 코드의 레이아웃이 같은 규칙에서 나온다.
- 캔버스 이동·확대: 바깥 컨테이너 `transform: translate() scale()` 하나만 바꾼다. React 상태가 아니라 ref로 직접 바꿔 다시 그리기 없음.
- 트랙패드: 두 손가락 = 이동(`wheel`), 핀치 = 확대(`wheel` + `ctrlKey`), Space+끌기 = 이동. 확대 중심은 커서 위치.
- 선택 상자·핸들·가이드·간격 표시: DOM 위 `<canvas>` 한 장에 그린다(DOM 노드 수를 늘리지 않음).
- 화면 밖 프레임은 썸네일 `<img>`로 바꿔 둔다(썸네일은 `freegma/.cache/thumbs/`에 캐시).
- 노드 컴포넌트는 노드 id로 메모이즈. 노드 하나 바뀌면 그 노드만 다시 그린다.
- 서체: 로컬 서체 목록은 Local Font Access API(`queryLocalFonts`), 프로젝트 서체는 `freegma/assets/fonts/`를 `@font-face`로. 원격 서체 없음.
- `render_image`: 같은 렌더러를 숨긴 창에서 열고 `webContents.capturePage()`로 PNG. 배율 1x/2x 선택.

## 7. IPC 규칙
- preload는 **기능 단위 함수만** 노출한다(`window.freegma.project.applyOps(ops)`, `window.freegma.git.commit(msg)` …). `ipcRenderer` 자체나 임의 경로 읽기 같은 범용 API는 노출하지 않는다.
- 채널 정의는 `apps/desktop/src/shared/ipc.ts` 한 파일에: 채널 이름 + zod 입력·출력 스키마. 메인은 받은 값을 항상 검증한다.
- 메인 → 렌더러 알림(외부 변경, MCP op, git 상태)은 16ms 단위로 모아 보낸다(cl-app 설계와 같은 방식).
- 큰 데이터(썸네일·이미지)는 IPC로 보내지 않고 커스텀 프로토콜(`freegma-asset://`)로 읽게 한다. 이 프로토콜은 열린 프로젝트의 `freegma/` 안만 응답한다.

## 8. Git 연동
- `git/run.ts`: `execFile('git', args, { cwd })` 얇은 래퍼. 셸을 거치지 않는다(인자 주입 방지). 환경 변수는 로그인 셸 env를 앱 시작 때 한 번 읽어 쓴다(독에서 띄워도 PATH·SSH 에이전트가 맞도록).
- 쓰는 명령: `rev-parse`, `status --porcelain=v2 -- freegma/`, `show HEAD:<path>`, `ls-tree`, `add -A -- freegma/`, `commit -F - -- freegma/`(메시지는 stdin), `config user.name/email`, `merge-base`·충돌 확인용 `ls-files -u`.
- **코드 상태·Design-Ref**(design.md §2-7): `log --format=%H%x09%(trailers:key=Design-Ref,valueonly) -- .`로 서비스 저장소의 반영 기록을 읽고(파일 감시 이벤트 뒤 한 번, 계속 돌리지 않음), 화면 id별 마지막 반영 커밋 ↔ 그 프레임 파일의 `log -1 -- freegma/screens/<화면>.fg.json` 를 비교해 ○◐✓를 정한다. «바뀐 것» 목록은 두 커밋 사이 노드 단위 비교(ChangeDiffer 재사용).
- **브랜치 메뉴**(design.md §2-2-1): 목록 `for-each-ref --sort=-committerdate refs/heads --format=…`, 만들기 `switch -c <이름>`(이름은 `check-ref-format --branch`로 먼저 검사), 전환 `switch <이름>`. 전환 전에 **저장소 전체** `status --porcelain=v2`(경로 한정 없이)로 깨끗한지 확인하고, 깨끗하지 않으면 실행하지 않는다(`--force`·stash 쓰지 않음). 전환 후 프로젝트 다시 읽기 + 되돌리기 기록 비우기 + ✦ AI 세션을 그 브랜치 것으로 바꾸기.
- 변경 수 표시: 파일 감시 이벤트 뒤 500ms 모아 `status` 한 번. 계속 돌리지 않는다.
- 변경 비교(design.md §5-2)는 워커에서: `HEAD`의 design 파일들을 `git show`로 읽어 지금 정본과 노드 id 단위로 비교.
- 훅이 실패하면 stderr를 그대로 커밋 창에 보여 준다.

## 9. 보안
- BrowserWindow: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`.
- CSP: `default-src 'self'; img-src 'self' freegma-asset: data:; font-src 'self' freegma-asset:; style-src 'self' 'unsafe-inline'` (캔버스 노드의 인라인 스타일 때문에 style만 inline 허용). 원격 출처 없음.
- 창 이동·새 창 차단(`will-navigate`, `setWindowOpenHandler`). 외부 링크는 http/https만 `shell.openExternal`.
- **Electron Fuses**: `RunAsNode` 끔, `EnableNodeOptionsEnvironmentVariable` 끔, `EnableNodeCliInspectArguments` 끔, `EnableEmbeddedAsarIntegrityValidation` 켬, `OnlyLoadAppFromAsar` 켬.
- 쓰기는 열린 프로젝트의 `freegma/` 안만(경로를 `realpath`로 풀어 확인, 심볼릭 링크로 밖에 나가는 것 차단). 예외: 배포 제외 설정(design.md §2-1-2) — 승인된 diff만, 별도 IPC 채널 하나(`setup.applyDeployExclusion`)로만.
- Claude Code 실행(저장소에서 가져오기): `execFile('claude', ['-p', 지시문, '--allowedTools', 'Read,Glob,Grep,mcp__freegma__*'], { cwd: 저장소 루트 })` — 셸을 거치지 않음. 설치·로그인 여부는 `claude --version`과 MCP 등록 목록으로 확인. 출력은 진행 표시에만 쓰고, 결과는 MCP `finish_import`로만 받는다.
- MCP 중계는 0600 유닉스 소켓(§4). 앱은 토큰·비밀번호를 다루지 않는다.

## 10. 빌드·배포
- `pnpm dev`: electron-vite 개발 서버(렌더러 HMR, 메인 변경 시 재시작).
- `pnpm build` → `pnpm dist`: electron-builder로 `freegma-<버전>-arm64.dmg`.
- **서명·공증**
  - 1차(나 혼자 사용): 서명 없이 로컬 빌드. 처음 열 때 «확인 없이 열기»(또는 `xattr -dr com.apple.quarantine`).
  - 남에게 배포할 때: Apple Developer Program 가입 → Developer ID 서명 + `notarytool` 공증 + hardened runtime. 엔타이틀먼트는 JIT(`allow-jit`)·서명 안 된 실행 메모리(`allow-unsigned-executable-memory`) 등 Electron 필수 항목만.
- **자동 업데이트**: macOS는 서명된 앱만 자동 업데이트가 된다. 그래서 서명 이후(2차)에 GitHub Releases + electron-updater. 서버를 따로 두지 않는다.
- 버전: SemVer. 앱 버전과 디자인 파일 포맷 버전(`formatVersion`)은 따로 관리한다.

## 11. 테스트
| 대상 | 방법 | 예 |
|---|---|---|
| 직렬화 | 골든 파일 | `fixtures/*` 읽고 다시 쓰면 바이트가 같다 |
| op·되돌리기 | 단위 테스트 | op 적용 → inverse 적용 → 원래 문서와 같다 |
| 변경 비교·커밋 메시지 | 스냅샷 | 두 fixture 사이 메시지가 기대 문자열과 같다 |
| 코드 생성 | 스냅샷 + 빌드 확인 | 생성 코드가 기대값과 같고, 샘플 Vite 프로젝트에서 타입 검사 통과 |
| 배포 제외 설정 | fixture 저장소 + 빌드 확인 | 해당 파일만 제안, 적용 후 Docker 컨텍스트·번들에 `freegma/` 없음 |
| 화면↔코드 | fixture 저장소 + 스냅샷 | 라우터별 파일·라우트 제안, `get_handoff` 꾸러미, Design-Ref 커밋을 심은 저장소에서 ○◐✓ 판정이 기대값과 같다 |
| ✦ AI 채팅 | 가짜 Claude(정해진 stream-json을 내는 스크립트)로 왕복 | 대상 첨부, 도구 표시, «N개 수정», 답변 되돌리기 후 파일이 원래와 같음 |
| 저장소에서 가져오기 | 프로세스 격리 확인 | Claude 실행 후 서비스 저장소 `git status`가 깨끗함, 확정 전 `freegma/system/` 변경 없음 |
| 디자인 시스템 | 골든 파일 + 스냅샷 | 템플릿 생성 결과(웹·모바일), 시스템 검사 코드·제안, `get_design_system`·`DESIGN_SYSTEM.md` 출력이 기대값과 같다 |
| 캔버스 = 코드 | 이미지 비교 | 같은 프레임을 캔버스와 생성 코드(브라우저)로 렌더 → 픽셀 차이 임계값 이하 |
| MCP | 도구 왕복 테스트 | 메모리 파일시스템 위에서 create → get → update → get_changes |
| 앱 흐름 | Playwright E2E | 프로젝트 만들기 → 사각형 그리기 → 저장 확인 → 커밋 → `git log` 확인 |
| 성능 | 벤치 스크립트 | design.md §9 표 항목을 `pnpm bench`로 측정, 결과를 기록 |
- 커밋 전 `pnpm check`(Biome + 타입 검사 + Vitest)를 git pre-commit 훅으로 돌린다. E2E·벤치는 수동 또는 CI(GitHub Actions macOS 러너).

## 12. 코드 규칙 (AI 개발용, CLAUDE.md에 요약)
- TypeScript strict, ESM, `any` 금지(불가피하면 이유 주석). 기본 export 대신 이름 있는 export.
- 파일 하나에 한 가지 역할. 300줄을 넘으면 나눈다.
- 스키마가 먼저: 새 데이터는 `packages/schema`에 zod로 정의하고 타입은 `z.infer`로.
- Electron API는 `apps/desktop`에서만. `packages/*`에서 `electron` import 금지.
- 모든 디자인 변경은 op로(직접 객체 수정 금지).
- 새 기능에는 fixture 또는 테스트를 같이 넣는다.
- 브랜치·커밋·PR: `docs/git-convention.md` — Git Flow(main·dev·feature/bugfix/release/hotfix, 병합은 PR), `<type>(<scope>): <subject>`(type 13종: feat·fix·docs·style·design·test·refactor·build·ci·perf·chore·rename·remove), footer `Ref: <작업 id>`, AI 서명 줄 금지.

## 13. 남은 확인
| # | 확인할 것 | 시점 |
|---|---|---|
| 1 | electron-vite 6과 Vite 8·Electron 45 조합이 문제없는가(안 되면 Vite 버전 내림) | 착수 |
| 2 | Electron 메인 프로세스 모드(MCP)에서 stdio가 안정적인가, 시작 시간(목표 500ms 이하) | 구현 4단계 |
| 3 | 숨긴 창 `capturePage`가 화면 밖·높은 배율에서 잘 찍히는가 | 구현 4단계 |
| 4 | @parcel/watcher가 Electron 45 네이티브 빌드로 문제없는가(안 되면 Node `fs.watch` recursive) | 착수 |
| 5 | Local Font Access API가 Electron에서 권한 창 없이 동작하는가 | 구현 2단계 |
| 6 | 서명 없는 빌드로 셸 명령(`/usr/local/bin` 링크)·Gatekeeper 문제가 없는가 | 구현 1단계 |

## 14. 착수 순서
1. 모노레포 뼈대: pnpm workspace, tsconfig, Biome, Vitest, `.node-version`(24), CLAUDE.md.
2. `schema` + `core`(직렬화·op·되돌리기) + `fixtures` 골든 테스트 — 화면 없이 먼저 완성.
3. `apps/desktop` 뼈대: 창·메뉴·preload·IPC 규칙·워커·fuses·CSP, 시작 화면.
4. 이후는 design.md §14 구현 순서를 따른다.
