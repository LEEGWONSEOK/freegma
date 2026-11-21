# freegma — AI 작업 안내

> 이 파일은 시작용 최소본이다. 작업 T0-6에서 코드 규칙(spec.md §12 요약)·주요 명령을 더해 완성한다.

## 먼저 읽을 문서
- `docs/tasks.md` — 작업 목록과 작업 규칙(§0). **다음 작업은 여기서 고른다.**
- `docs/design.md`(무엇을), `docs/spec.md`(어떻게), `docs/design-system.md`(디자인 시스템), `docs/mockup/`(화면 동작 기준)
- `docs/git-convention.md` — 브랜치·커밋·PR 규칙

## Git 규칙 (요약 — 자세한 건 docs/git-convention.md)
- **Git Flow**(개발 브랜치는 `dev`): dev·main에 직접 커밋·push 금지. 작업마다 **최신 dev에서** `feature/<작업 id>-<설명>` 브랜치(예: `feature/T0-1-node-pnpm`) → 커밋 → push → `gh pr create --base dev`. **병합은 사람이 한다.** release·hotfix 브랜치, main으로 가는 PR, 태그는 사람이 요청할 때만.
- **커밋 메시지**: `<type>(<scope>): <subject>` + 빈 줄 + body(무엇을·왜, 72자 줄바꿈) + 빈 줄 + footer(`Ref: T1-3`, `Fixes: #12`).
  - type: `feat` `fix` `docs` `style` `design` `test` `refactor` `build` `ci` `perf` `chore` `rename` `remove`
  - subject 50자 이내, 마침표 없음, 한국어 권장(영어면 대문자 시작·명령형).
- **커밋·PR에 AI 서명 줄을 넣지 않는다**(`Co-Authored-By: Claude`, `Generated with Claude Code` 등). `.claude/settings.json`의 `attribution`으로 꺼 두었다.
- `--force` push, `reset --hard`, 원격 브랜치 삭제는 사람이 요청할 때만.
