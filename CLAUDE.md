# freegma — AI 작업 안내

로컬에 설치해 쓰는 UI/UX 디자인 툴(Electron, macOS arm64). 디자인은 서비스 저장소 안 `freegma/` 텍스트 파일로 저장하고 git으로 남긴다. AI는 MCP로 디자인을 읽고 고친다.

## 먼저 읽을 문서
| 문서 | 언제 |
|---|---|
| `docs/tasks.md` | **작업을 고를 때** — §0 작업 규칙, 다음 작업은 «의존이 모두 `[x]`인 첫 `[ ]`» |
| `docs/design.md` | 무엇을 만드는가(화면·파일 형식·MCP·커밋 메시지) |
| `docs/spec.md` | 어떻게 만드는가(스택·구조·프로세스·보안·테스트) |
| `docs/design-system.md` | 디자인 시스템(토큰·컴포넌트·검사 규칙) |
| `docs/mockup/index.html` | 화면 동작의 기준 — 화면 작업 전에 같은 흐름을 눌러 본다 |
| `docs/git-convention.md` | 브랜치·커밋·PR 규칙 |

작업의 «참고»에 적힌 절을 먼저 읽는다. 문서와 다르게 해야 하면 **멈추고 사람에게 묻는다**(문서를 몰래 바꾸지 않는다).

## 환경
- Node **24**(`.node-version`, `.nvmrc`) · pnpm **12.21.0**(`packageManager`, corepack). Node가 24가 아니면 `pnpm install`이 멈춘다(`engineStrict`).
  - 셸의 Node가 22면: `export PATH="$HOME/.nvm/versions/node/v24.22.3/bin:$PATH"` 또는 `nvm use`.
- TypeScript 7(네이티브 `tsc`). dependency-cruiser만 TypeScript 6을 따로 쓴다(`pnpm-workspace.yaml` `packageExtensions`).
- git 훅(lefthook): 커밋 전 `pnpm check`, 커밋 메시지 commitlint. `pnpm install` 때 자동 설치(`prepare`).

## 명령
| 명령 | 하는 일 |
|---|---|
| `pnpm check` | **모든 작업의 공통 완료 조건** = lint → deps → typecheck → test |
| `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome 검사 / 고칠 수 있는 것 고침 / 포맷 |
| `pnpm deps` | 패키지 의존 방향 검사(`.dependency-cruiser.json`) |
| `pnpm typecheck` | 루트(tests·설정) + 각 패키지 `tsc` |
| `pnpm test` / `pnpm test:watch` | Vitest(tests/, packages/*, apps/*) |

## 구조와 의존 방향 (spec §3)
```
packages/  schema ← core ← diff · style · codegen ← mcp-tools      (codegen → style 허용)
apps/      desktop (Electron, T2-1에서 생성) — Electron API는 여기서만
tests/     저장소 전체 검사
```
- 거꾸로 import, `packages → apps`, `packages`의 `electron`·`fs`·`child_process`는 `pnpm deps`가 막는다(테스트 파일의 `fs`는 허용).
- 새 패키지 의존은 그 패키지 `package.json`에 `"@freegma/x": "workspace:*"`로 선언한다.

## 코드 규칙 (spec §12)
- TypeScript strict, ESM. **`any` 금지**(불가피하면 이유 주석). **기본 export 금지** — 이름 있는 export(`*.config.*` 파일만 예외).
- 파일 하나에 한 가지 역할. **300줄을 넘으면 나눈다.**
- **스키마가 먼저**: 새 데이터는 `packages/schema`에 zod로 정의하고 타입은 `z.infer`로.
- **모든 디자인 변경은 op로**(문서 객체를 직접 수정하지 않는다, spec §5).
- **새 기능에는 fixture 또는 테스트를 같이 넣는다.** 골든 파일(`fixtures/**/*.fg.json`)은 바이트까지 같아야 하므로 포매터가 건드리지 않는다.
- 문서·주석·커밋은 한국어. 코드 식별자는 영어.

## 작업 하나를 하는 순서
1. `git switch dev && git pull` → `git switch -c feature/<작업 id>-<영문 설명>`
2. `docs/tasks.md`에서 그 작업을 `[~]`로.
3. 구현 + 테스트. 완료 조건을 **실제 명령으로** 확인(부정 사례도 가능하면 확인).
4. 커밋(훅이 `pnpm check`와 메시지를 검사) → `docs/tasks.md`를 `[x] — 날짜 · 커밋 해시`, «메모»에 확인한 것·결정한 것 → 진행 요약 숫자 갱신.
5. `git push -u origin <브랜치>` → `gh pr create --base dev`(본문은 `.github/pull_request_template.md`).
6. 막히면 `[!]` + 이유를 적고 사람에게 알린다.

## Git 규칙 (요약 — 원문은 docs/git-convention.md)
- **Git Flow**(개발 브랜치는 `dev`): dev·main에 직접 커밋·push 금지. 작업은 `feature/…`에서 → **dev로 PR**. **병합은 사람이 한다.** release·hotfix 브랜치, main으로 가는 PR, 태그는 사람이 요청할 때만.
- **커밋 메시지**: `<type>(<scope>): <subject>` + 빈 줄 + body(무엇을·왜, 줄 72자) + 빈 줄 + footer(`Ref: T1-3`, `Fixes: #12`).
  - type: `feat` `fix` `docs` `style` `design` `test` `refactor` `build` `ci` `perf` `chore` `rename` `remove`
  - subject 50자 이내, 마침표 없음, 한국어 권장(영어면 대문자 시작·명령형).
- **커밋·PR에 AI 서명 줄을 넣지 않는다**(`Co-Authored-By: Claude`, `Generated with Claude Code` 등). `.claude/settings.json`의 `attribution`으로 꺼 두었고 commit-msg 훅도 거부한다.
- 훅을 건너뛰지 않는다(`--no-verify` 금지). `--force` push, `reset --hard`, 원격 브랜치 삭제는 사람이 요청할 때만.
- 훅을 시험할 때 `git stash -u`를 쓰지 않는다 — 새 설정 파일(`lefthook.yml` 등)까지 치워져 훅이 꺼진 채로 커밋된다.
