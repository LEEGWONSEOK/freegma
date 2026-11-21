# freegma Git 규칙 (브랜치 · 커밋 · PR)

> 상태: 확정(개정 1 — Git Flow로 변경) | 작성: 2026-11-21 | 적용: 사람·AI(Claude Code) 모두
> 한 줄 요약: **Git Flow**(main · dev · feature/bugfix/release/hotfix, 병합은 모두 PR)로 개발하고, 커밋 메시지는 `<type>(<scope>): <subject>` 형식(nohack.tistory.com/17 컨벤션)으로 쓴다. 커밋·PR에 AI 서명 줄을 넣지 않는다.

## 1. 브랜치 전략: Git Flow
표준 Git Flow를 따른다. 개발 브랜치 이름만 `develop` 대신 **`dev`** 를 쓴다.
```
main     ──●───────────────────────●──────────●──   릴리스만. 태그 v0.1.0, v0.1.1 …
            \                     / \        /
hotfix/*     \                    /   ●──────●      main에서 → main·dev 양쪽에 병합
release/*     \            ●────●            \
               \          /      \            \
dev      ──────●──●──────●────────●───────────●──   개발 통합. 기본 브랜치
                  \    /
feature/*          ●──●                             dev에서 → dev로 PR
```
| 브랜치 | 어디서 만드나 | 어디로 병합하나 | 역할 |
|---|---|---|---|
| `main` | — | — | 릴리스된 상태만. 직접 커밋·push 금지 |
| `dev` | main | — | 개발 통합. **기본 브랜치**. 직접 커밋·push 금지 |
| `feature/*` | dev | dev | 작업 하나(`docs/tasks.md`의 T 하나). 기능·문서·설정 모두 |
| `bugfix/*` | dev | dev | dev에서 찾은 버그(아직 릴리스 안 된 것) |
| `release/*` | dev | **main + dev** | 릴리스 준비: 버전 올리기·마지막 수정만, 새 기능 금지 |
| `hotfix/*` | main | **main + dev** | 릴리스된 main의 급한 수정 |

### 흐름
1. **작업**: 최신 dev에서 `feature/…` → 커밋 → push → **dev로 PR** → 병합(Squash) → 브랜치 삭제.
2. **릴리스**: dev에서 `release/v0.1.0` → 버전 올리기·마지막 수정 → **main으로 PR**(Merge commit) → main에 태그 `v0.1.0` → **같은 release 브랜치를 dev로도 PR**(Merge commit)해 수정 사항을 되돌려 놓음 → 브랜치 삭제.
3. **급한 수정**: main에서 `hotfix/v0.1.1-…` → 수정·버전 올리기 → **main으로 PR**(Merge commit) → 태그 `v0.1.1` → **dev로도 PR** → 브랜치 삭제.
4. 버전은 SemVer(`v주.부.수`, spec.md §10). 개발 초기(1.0 전)는 `v0.x.y`.

### 브랜치 이름
```
feature/<작업 id>-<짧은 영문 설명>      feature/T0-1-node-pnpm
feature/<짧은 영문 설명>                feature/git-convention   (작업 id 없는 문서·설정)
bugfix/<작업 id 또는 이슈>-<설명>        bugfix/T2-8-atomic-write, bugfix/12-font-size
release/v<버전>                        release/v0.1.0
hotfix/v<버전>-<설명>                   hotfix/v0.1.1-git-path
```
- 설명은 영문 소문자와 `-`만. 커밋 type(feat·docs·chore …)은 브랜치 이름이 아니라 **커밋 메시지**로 나타낸다.
- (선택) `git flow init`을 쓰면 develop 브랜치 이름을 `dev`로, 접두어는 위와 같이(`feature/` `bugfix/` `release/` `hotfix/`, 버전 태그 접두어 `v`) 지정한다. 다만 병합은 git-flow 명령이 아니라 **GitHub PR**로 한다.

## 2. 커밋 메시지
### 2-1. 구조
```
<type>(<scope>): <subject>
<빈 줄>
<body>
<빈 줄>
<footer>
```
- `(<scope>)`, `<body>`, `<footer>`는 필요할 때만 쓴다. 첫 줄(header)은 꼭 쓴다.

### 2-2. type (이 목록에 있는 것만 쓴다)
| type | 언제 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `style` | 코드 스타일 변경(포매팅, 세미콜론 누락 등 — 동작 변화 없음) |
| `design` | 사용자 UI 디자인 변경(CSS 등) |
| `test` | 테스트 코드 추가·수정·리팩토링 |
| `refactor` | 프로덕션 코드 리팩토링(동작 변화 없음) |
| `build` | 빌드 파일·빌드 설정 수정 |
| `ci` | CI 설정 파일 수정 |
| `perf` | 성능 개선 |
| `chore` | 자잘한 수정, 의존성·빌드 업데이트 |
| `rename` | 파일·폴더 이름만 바꾼 경우 |
| `remove` | 파일을 삭제만 한 경우 |

### 2-3. scope (선택)
- 바뀐 부분의 이름. freegma에서는 **패키지·앱 영역 이름**을 쓴다: `schema` `core` `diff` `codegen` `style` `mcp-tools` `desktop` `main` `renderer` `canvas` `system` `git` `mcp` `ai` `docs` `mockup` 등.
- 여러 곳이면 가장 중요한 하나만 쓰거나 생략한다.

### 2-4. subject
- **50자 이내**(영문 기준), 끝에 마침표(`.`)를 찍지 않는다.
- 영어로 쓰면 **첫 글자는 대문자**, **명령문·동사원형**(`Add`, `Fix`, `Implement`, `Update`, `Remove`).
- 한국어로 써도 된다. 이때는 «무엇을 + 했다» 꼴로 짧게 쓰고 끝을 명사·동사 원형으로 맺는다(`안정된 직렬화 구현`, `저장 지연 수정`).
- 한 저장소 안에서는 가능하면 같은 언어로 맞춘다(freegma 문서는 한국어 → **subject도 한국어 권장**).

### 2-5. body (선택)
- 한 줄에 **72자 이내**.
- **어떻게**보다 **무엇을, 왜** 바꿨는지 쓴다. 코드를 보면 알 수 있는 내용은 쓰지 않는다.

### 2-6. footer (선택)
- 관련 이슈·작업을 적는다. 키워드: `Closes`(종료), `Fixes`(수정), `Resolves`(해결), `Ref`(참고), `Related to`(관련).
  ```
  Fixes: #12
  Ref: T1-3
  ```
- **작업 id는 footer의 `Ref:`에 쓴다.** subject는 내용만 담아 짧게 유지한다.

### 2-7. 쓰지 않는 것
- **AI 서명 줄을 넣지 않는다**: `Co-Authored-By: Claude …`, `🤖 Generated with Claude Code` 같은 줄. (Claude Code는 `.claude/settings.json`의 `attribution` 설정으로 자동으로 넣지 않는다.)
- `WIP`, `update`, `fix bug`처럼 내용 없는 메시지.
- 서로 관계없는 변경을 한 커밋에 섞지 않는다.

### 2-8. 예
```
feat(core): 안정된 직렬화 구현

스키마에 정한 키 순서와 숫자 반올림으로 같은 디자인이 항상 같은
바이트로 저장되게 한다. 작은 수정이 작은 diff로 남아야 하기 때문.

Ref: T1-3
```
```
fix(desktop): 독에서 실행하면 git을 못 찾는 문제 수정

Finder·독에서 띄우면 로그인 셸 PATH를 물려받지 못한다.
앱 시작 때 로그인 셸 env를 한 번 읽어 git 실행에 쓴다.

Fixes: #8
Ref: T2-4
```
```
docs: git 규칙 문서 추가
```
```
chore(deps): electron 45.1로 올림
```

> 참고: freegma **앱이 사용자 저장소에 만드는 디자인 커밋**(`design(주문): 쿠폰함 추가` — design.md §5-2)은 이 규칙과 별개인 **제품 기능**이다. 다만 접두어 `design`은 이 컨벤션의 `design`(UI 디자인 변경) 타입과 뜻이 같아 그대로 맞는다.

## 3. PR
- **제목**: 커밋 header와 같은 형식(`feat(core): 안정된 직렬화 구현`). 작업 id는 본문에.
- **본문**: `.github/pull_request_template.md`를 채운다 — 작업 id, 한 일, 완료 조건 확인 결과(명령과 결과), 화면이면 목업과 비교한 스크린샷.
- **feature·bugfix PR(→ dev)의 병합 방식**: **Squash and merge**. dev에는 PR 하나 = 커밋 하나가 남고, 그 커밋 메시지는 PR 제목 + 본문 요약(§2 형식)으로 정리한다. 작업 브랜치의 중간 커밋은 자유롭게 써도 되지만 §2 형식을 지킨다.
- **release·hotfix PR(→ main, → dev)의 병합 방식**: **Create a merge commit**(squash하면 main과 dev 기록이 갈라진다). 제목 `chore(release): v0.1.0`·`fix(…): …`, 본문에 들어간 작업 목록. main 병합 후 태그를 단다.
- 병합 후 브랜치 삭제(dev·main은 지우지 않음). release·hotfix는 main·dev 두 PR이 모두 병합된 뒤 지운다.
- PR 본문에도 AI 서명 줄을 넣지 않는다.

## 4. AI(Claude Code)가 지킬 것
1. 작업을 시작하면 **최신 dev에서 `feature/<작업 id>-<설명>` 브랜치를 만든다**(`git switch dev && git pull && git switch -c feature/T0-1-node-pnpm`). dev·main에 직접 커밋·push하지 않는다.
2. 커밋은 §2 형식, footer에 `Ref: <작업 id>`. AI 서명 줄 금지.
3. 완료 조건(`pnpm check` 등)을 통과한 뒤 push하고 **dev로** PR을 연다(`gh pr create --base dev`). 실패하면 PR을 열지 않고 `docs/tasks.md`에 `[!]`와 이유를 적는다.
4. **병합은 사람이 한다**(dev·main 모두). AI는 병합하지 않는다. release·hotfix 브랜치와 main으로 가는 PR, 태그는 사람이 요청할 때만 만든다.
5. `git push --force`, `git reset --hard`, 원격 브랜치 삭제는 사람이 요청했을 때만.
6. 작업 상태 표시(`[~]`·`[x]`·날짜·커밋 해시) 변경도 같은 PR에 포함한다.
