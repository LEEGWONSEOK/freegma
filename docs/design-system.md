# freegma 디자인 시스템

> 상태: 초안(개정 1 — `freegma/` 디렉토리, Claude 가져오기, 빈 시스템 제거 2026-11-21) | 작성: 2026-11-21 | 짝 문서: `docs/design.md`(§2-1-1, §2-5, §3, §5-2, §6) | 목업: `docs/mockup/index.html` → [디자인 시스템]
> 한 줄 요약: 프로젝트를 만들 때 **디자인 시스템(토큰·글자 스타일·컴포넌트·사용 규칙)을 함께 만든다.** 왼쪽 네비 맨 위 «디자인 시스템»에서 사람이 보고 고치고, AI는 같은 내용을 MCP `get_design_system`으로 먼저 읽고 그 규칙 안에서만 디자인한다.

## 0. 왜 필요한가
- 회사 서비스는 보통 화면보다 먼저 **디자인 시스템**이 있다. 브랜드 색, 글자 체계, 간격 단계, 공통 컴포넌트와 «언제 무엇을 쓰는지» 규칙이 정해져 있고, 화면은 그 위에서 만든다.
- 지금 설계(design.md 개정 1)에는 토큰과 컴포넌트가 «왼쪽 탭 두 개»로만 있다. 묶음으로 보고 관리하는 곳이 없고, **용도 설명이 없어서** AI는 이름만 보고 값을 고르거나 새 값을 지어낸다(`#3B82F6`, `gap: 14`).
- freegma는 AI로 디자인하는 툴이다. AI가 매번 일관된 화면을 만들려면 «무엇이 있고, 어디에 쓰고, 무엇은 하면 안 되는지»가 **기계가 읽을 수 있는 형태**로 있어야 한다.

### 원칙 (우선순위 순서)
1. **시스템이 먼저, 화면은 그 위에.** 모든 화면은 시스템의 토큰·컴포넌트로 만든다. 시스템 값을 바꾸면 쓰는 화면이 모두 함께 바뀐다.
2. **이름이 곧 용도.** 디자인에서 쓰는 토큰은 `color.primary`, `color.muted`처럼 용도를 이름으로 가진 **의미 토큰**뿐이다. `blue.600` 같은 기초값은 의미 토큰이 가리키는 팔레트일 뿐이다.
3. **설명도 데이터다.** 토큰·글자 스타일·컴포넌트마다 «쓸 때 / 피할 때»를 파일에 저장한다. 사람에게는 문서이고, AI에게는 규칙이다.
4. **사람이 보는 것 = AI가 읽는 것.** 디자인 시스템 화면, `get_design_system` 응답, `DESIGN_SYSTEM.md`는 모두 같은 파일(`freegma/system/`)에서 나온다. 따로 쓰지 않는다.
5. **사람은 막지 않고, AI는 검사한다.** 캔버스에서 사람이 원시값을 쓰면 표시만 한다. AI가 MCP로 쓰면 규칙(§5-4)으로 검사해 경고하거나 거절한다.

## 1. 무엇이 들어가나
| 묶음 | 내용 | 기본으로 생기는 것 | 파일 |
|---|---|---|---|
| 개요·원칙 | 이름, 버전, 원칙 문장, AI 규칙 설정 | 원칙 4개(§4-1) | `system.json` |
| 색 — 기초값 | 팔레트. 디자인에서 직접 쓰지 않음 | `brand.50~900`(대표 색에서 자동 생성), `gray.0~900`, 상태 색(green·amber·red) | `tokens/primitives.tokens.json` |
| 색 — 의미 토큰 | 디자인에서 쓰는 색. 기초값을 가리킨다 | `primary` `on-primary` `bg` `surface` `text` `muted` `border` `success` `warning` `danger` | `tokens/color.tokens.json` |
| 글자 | 서체, 크기 단계, **글자 스타일**(크기·굵기·줄 높이 묶음) | Display · Heading · Title · Body · Caption | `tokens/typography.tokens.json` |
| 간격 | 4의 배수 단계 | `spacing.1~12`(4·8·12·16·20·24·32·48) | `tokens/spacing.tokens.json` |
| 모서리·그림자 | 요소 크기·높이에 따른 단계 | `radius.sm/md/lg`, `shadow.sm/md` | `tokens/radius.tokens.json`, `tokens/shadow.tokens.json` |
| 기본 컴포넌트 | 서비스와 무관한 공통 부품. 변형·상태 포함 | Button · Input · Badge · Card | `components/*.fg.json` |
| 서비스 컴포넌트 | 기본 컴포넌트·토큰을 조립해 서비스에 맞게 만든 것 | (사람·AI가 추가) 예: NavBar, ProductCard, CartItem | `components/*.fg.json` |
| AI 규칙 | 원시값 처리(경고/거절), 검사 규칙 | 경고 후 반영(§7-1) | `system.json` |

- **기본 컴포넌트 4종(Button · Input · Badge · Card)** 은 «거의 모든 서비스 화면에 나오는 것»만 골랐다. 늘리면 템플릿이 무거워지고, AI가 «있는 것»을 고르기도 어려워진다. 나머지는 서비스 컴포넌트로 추가한다.
- 컴포넌트는 `kind: "base" | "service"`로 나눈다. 화면에서 두 묶음으로 보이고, AI도 기본 컴포넌트를 먼저 고른다.

## 2. 프로젝트 만들 때 생성 (design.md §2-1-1)
시작 방식은 **두 가지**다. 방식마다 받는 입력이 다르다.

| 시작 방식 | 입력 | 하는 일 | 조건 |
|---|---|---|---|
| **기본 템플릿**(기본값) | 브랜드 대표 색 · 서체 | §1 표의 «기본으로 생기는 것» 전부를 규칙으로 만든다 | 없음 |
| **저장소에서 가져오기 ✦** | 분석 범위(기본: 저장소 전체) | Claude가 저장소의 디자인 방식을 분석해 freegma 형식으로 **다시 만든다**(§2-2) | **Claude Code 연결 필요** |

- **빈 시스템은 두지 않는다.** 시스템이 비면 AI가 쓸 토큰이 없어 원시값을 지어내게 되고, «시스템이 먼저» 원칙과 부딪힌다. 작게 시작하고 싶으면 템플릿에서 지운다(쓰는 곳 없는 토큰은 안전하게 지워짐).
- 브랜드 색·서체 입력은 **기본 템플릿을 고를 때만** 보인다. 가져오기는 그 값을 저장소에서 찾고, 못 찾은 것만 초안 화면에서 묻는다.

### 2-1. 기본 템플릿
```
디자인 시스템   [● 기본 템플릿] [ 저장소에서 가져오기 ✦ ]
 브랜드 색 [■ #2563EB]   서체 [ Pretendard ▾ ]
 ▕▏▕▏▕▏▕▏▕▏▕▏▕▏  ← brand.50~900 미리보기(자동 생성)
```
- 입력은 **브랜드 대표 색 하나와 서체**뿐이다. 나머지는 규칙으로 만든다(사람이 처음부터 수십 개 값을 고르지 않게).
- **brand 단계 계산**: 대표 색을 `brand.600`으로 두고, 흰색과 섞어 50(93%)·100(84%)·300(55%)·500(20%), 검은색과 섞어 700(18%)·900(50%)을 만든다. 결정적이라 같은 색이면 항상 같은 값이 나온다. (2차: OKLCH 기반 단계로 바꿀지 검토)
- **플랫폼별 기본값**

| | 웹 | 모바일 앱 |
|---|---|---|
| 글자 크기 단계 | 14 · 16 · 20 · 28 · 40 px | 13 · 15 · 17 · 22 · 28 pt (iOS 기본 단계에 맞춤) |
| 간격 단위 | 4px 단계 | 4pt 단계 + 안전 영역 토큰(`safe.top`·`safe.bottom`) |
| Button 최소 높이 | 40px | 44pt |
| 기본 컴포넌트 코드 연결 | `@/components/ui/*`(shadcn 규칙) | `@/components/*` |

### 2-2. 저장소에서 가져오기 ✦ (Claude)
저장소에 테마가 있어도 freegma 형식(기초값/의미 토큰 두 층, 글자 스타일, 컴포넌트 usage)과 맞지 않는 경우가 많다. 그래서 정해진 규칙으로 파일을 옮기지 않는다. **Claude가 저장소의 디자인 방식을 해석해 `freegma/system/` 아래에 freegma 형식으로 다시 만든다.** 원래 방식(색 체계·간격 단위·컴포넌트 구성·이름)은 살리고, 형식은 freegma에 맞춘다.

```
디자인 시스템   [ 기본 템플릿 ] [● 저장소에서 가져오기 ✦ ]
 ✓ Claude Code 연결됨 · freegma MCP 등록됨
 분석 범위 [ ./ ]
```
- **연결 조건**: Claude Code CLI가 설치·로그인돼 있고 freegma MCP가 등록돼 있을 때(시작 화면·상태줄의 «AI 연결됨»과 같은 기준).
- **연결이 안 돼 있으면** 이 선택지는 꺼지고 «Claude Code 연결 필요 · 연결 방법»을 보여 준다. 템플릿으로 시작한 뒤, 연결하고 디자인 시스템 화면의 **[저장소에서 다시 만들기 ✦]** 로 나중에 할 수 있다.

**실행 방식** — MCP는 Claude가 앱을 부르는 방향이라 앱이 먼저 일을 시킬 수 없다. 그래서 앱이 **사용자 PC의 Claude Code를 실행**한다(사용자 로그인 사용, 앱 안에 AI·API 키 없음).
```
claude -p "<freegma 가져오기 지시문>" --allowedTools "Read,Glob,Grep,mcp__freegma__*"
```
- **읽기 도구 + freegma MCP만 허용** → 서비스 코드를 고칠 수 없고, `freegma/`에도 MCP(스키마 검증)를 거쳐서만 쓴다. 형식이 깨질 수 없다.
- 가져오기 동안 MCP 쓰기는 «가져오기 모드»: **초안**에만 쓰고, 확정 전까지 진짜 시스템은 그대로다.
- 진행 상황을 창에 보여 주고 취소할 수 있다(처음 만들 때 취소 → 기본 템플릿으로 만듦).

**Claude가 하는 일**(지시문에 고정)
1. 디자인 관련 위치 찾기: 테마 파일, Tailwind 설정, CSS 변수, 컴포넌트 폴더. 흩어진 값은 freegma가 미리 집계한 `scan_repo_values`(값·횟수·쓰인 요소·위치, 결정적)를 받아 쓴다 — 정확도를 높이고 토큰을 아끼기 위해. 테마 파일이 없는 저장소도 이 집계로 다룬다.
2. 방식 해석: 예) «Tailwind 4 `@theme` + shadcn 변수, primary = `--primary`, 4px 간격, 버튼 variant 4개».
3. freegma 형식으로 다시 만들기: 기초값·의미 토큰(용도·피할 곳 포함, `set_tokens`), 글자 스타일, 기본 컴포넌트와 코드 연결·usage(`update_components`). 저장소 컴포넌트의 변형이 템플릿과 다르면 저장소 쪽을 따른다(예: shadcn `default→primary`, `outline·ghost→ghost`, `secondary` 추가).
4. 항목마다 **출처**(파일:줄 또는 «text-gray-500 ×29»)와 **확신도**(높음·중간·낮음), **옮기지 못한 것**과 이유를 남긴다(`finish_import`).

**가져오기 초안 화면**(사람 확인)
```
항목            freegma                 출처                          확신
color.primary   → brand.600 (#4F46E5)   src/index.css:14 --primary    높음  [버리기]
color.muted     → gray.500              text-gray-500 ×29 (Card.tsx…) 중간  [버리기]
color.success   → green.600             text-green-600 ×4             낮음  [버리기]
서체            [Pretendard ▾]          저장소에서 찾지 못함             없음  직접 선택
Button          primary·ghost·secondary components/ui/button.tsx      높음  [버리기]
⚠ 옮기지 못함: chart-1~5(차트 전용), sidebar-* 8개(사이드바 전용)
[버리고 템플릿으로]                         [✦ Claude에게 다시 요청] [확정]
```
- 버린 의미 토큰은 템플릿 값으로 채운다. 못 찾은 값(서체 등)은 여기서 고른다.
- [확정] → 시스템 생성. 분석 결과는 `freegma/system/IMPORT_REPORT.md`로 남긴다(«이 토큰은 어디서 왔나» 추적).
- [저장소에서 다시 만들기]도 같은 흐름이다. 확정하기 전까지 지금 시스템은 바뀌지 않고, 확정하면 커밋 창에 «디자인 시스템» 변경으로 나온다.

### 2-3. 만든 뒤
- 만든 직후 편집 화면은 **디자인 시스템 화면으로 열린다**(«무엇이 만들어졌는지»를 먼저 보여 주기). 화면은 아직 없다.
- 생성은 `freegma/` 뼈대 생성(작업 T1-9)과 같은 op 묶음 하나다. 생성 직후 상태가 첫 커밋 대상이 된다.

## 3. 화면
### 3-1. 왼쪽 네비
```
┌ 왼쪽 패널 ───────────────┐
│ 디자인 시스템              │
│  ◆ my-shop 시스템  v1.0.0 │ ← 누르면 가운데가 시스템 문서로 바뀐다
│ 화면              [+화면]  │
│   홈                   1 │
│   상품 상세             2 │
│ ──────────────────────── │
│ (화면일 때) [레이어|컴포넌트|토큰]            │
│ (시스템일 때) 개요·원칙                       │
│              기초: 색 · 글자 · 간격 · 모서리·그림자 │
│              기본 컴포넌트: Button · Input …  │
│              서비스 컴포넌트: NavBar …         │
│              규칙: AI 규칙                    │
└──────────────────────────┘
```
- «디자인 시스템»은 **화면 목록 위**에 고정한다. 화면과 같은 자리에서 고르지만 화면 목록에는 섞이지 않는다(시스템은 하나, 화면은 여럿).
- 화면을 보고 있을 때의 [컴포넌트]·[토큰] 탭은 그대로 둔다(끌어 놓기·빠른 확인용). 맨 위에 «◆ 디자인 시스템에서 보기·고치기» 링크를 둔다.

### 3-2. 가운데 — 시스템 문서 화면
캔버스 대신 **위에서 아래로 읽는 문서**가 나온다(무한 캔버스가 아니라 스크롤). 견본은 실제 렌더러로 그린다(캔버스와 같은 `style` 패키지).

| 절 | 보이는 것 | 누르면 |
|---|---|---|
| 개요·원칙 | 이름·버전·플랫폼·서체·개수, 원칙 목록 | 오른쪽에 시스템 설정 |
| 색 | 기초값 팔레트, 의미 토큰 표(견본 · 이름 · → 참조 · 값 · 용도) | 오른쪽에 토큰 편집 |
| 글자 | 글자 스타일별 실제 크기 예문 + 크기 토큰·굵기·줄 높이·용도 | 글자 스타일 편집 |
| 간격 | 단계별 막대 + 용도 | 토큰 편집 |
| 모서리·그림자 | 단계별 견본 | 토큰 편집 |
| 컴포넌트 | 컴포넌트마다 **변형 × 상태 견본 표**, 쓸 때/피할 때, 속성, 코드 연결, 인스턴스 수 | 컴포넌트 편집 |
| AI 규칙 | 검사 규칙 목록, 원시값 처리(경고/거절) 전환, [AI가 읽는 형태 보기] | — |

- 도구 막대는 그리기 도구 대신 시스템 이름·경로와 **[✦ AI가 읽는 형태 보기]**(=`get_design_system` 응답 미리보기)를 보여 준다.
- 견본의 변형·상태(예: Button = primary·ghost·inverse × 기본·눌림·비활성)는 컴포넌트 파일의 `variants`·`states`에서 나온다. 컴포넌트 원본 프레임을 편집하는 곳은 기존 캔버스(컴포넌트 더블클릭 → 원본 편집)다.

### 3-3. 오른쪽 — 편집 패널
| 고른 것 | 고칠 수 있는 것 | 함께 보이는 것 |
|---|---|---|
| 없음(개요) | 브랜드 대표 색(→ brand 단계 다시 생성), 서체, 원시값 처리(경고/거절), [저장소에서 다시 만들기 ✦](Claude 연결 시, §2-2) | 구성 개수, 검사 결과(토큰 밖 값을 쓰는 레이어 수), 파일 목록 |
| 의미 색 토큰 | 참조할 기초값, 용도, 피할 곳 | 계산된 값, **사용처**(레이어 목록 → 누르면 그 화면으로), 저장될 JSON |
| 크기 토큰(간격·모서리·글자 크기) | 값, 용도 | 사용처, JSON |
| 기초값 | 색 값 | 이 값을 가리키는 의미 토큰 |
| 글자 스타일 | 크기 토큰, 굵기, 줄 높이, 용도 | 사용처, JSON |
| 컴포넌트 | 쓸 때, 피할 때, 접근성 | 속성·변형·상태, 쓰는 토큰, 코드 연결, 인스턴스 목록, JSON |

- **고치면 바로 모든 화면에 반영**된다(토큰은 CSS 변수라 다시 그리기만 하면 됨, design.md §8).
- 바꾸기 전에 영향을 볼 수 있게 «사용처 N곳»을 항상 보여 준다. 쓰이는 토큰을 지우거나 이름을 바꾸는 규칙은 작업 T4-3과 같다(삭제 경고, 이름 변경은 참조 일괄 갱신, 되돌리기 한 번).
- 개발 모드에서 시스템을 열면 오른쪽은 **토큰 내보내기 미리보기**(design.md §7)가 된다.

## 4. 파일 형식
```
freegma/
  system/
    system.json                 ← 이름·버전·서체·원칙·AI 규칙
    tokens/
      primitives.tokens.json    ← 기초값(직접 쓰지 않음)
      color.tokens.json         ← 의미 색 (기초값 참조)
      typography.tokens.json    ← 서체·글자 크기·글자 스타일
      spacing.tokens.json
      radius.tokens.json
      shadow.tokens.json
    components/
      button.fg.json            ← 컴포넌트 원본 트리 + 속성·변형·상태 + 사용 규칙 + 코드 연결
      input.fg.json  badge.fg.json  card.fg.json
      product-card.fg.json      ← 서비스 컴포넌트도 같은 폴더(kind로 구분)
    DESIGN_SYSTEM.md            ← AI용 요약. 앱이 자동 생성(§5-3), 직접 고치지 않음
    IMPORT_REPORT.md            ← 저장소에서 가져왔을 때만: 출처·확신도·옮기지 못한 것(§2-2)
  screens/ …
```
- 개정 1의 `freegma/tokens/`·`freegma/components/`를 `freegma/system/` 아래로 옮긴다. 화면(`screens/`)과 시스템이 폴더로 나뉘어 «먼저 시스템, 다음에 화면» 순서가 사람·AI 모두에게 보인다. 노드의 토큰 참조 문법(`"{color.primary}"`)은 그대로다.
- 토큰 파일은 **W3C Design Tokens(DTCG)** 형식. 표준 칸(`$type`·`$value`·`$description`)을 쓰고, freegma 전용 정보는 `$extensions.freegma`에만 넣는다(다른 도구·Style Dictionary가 그대로 읽게).

### 4-1. `system.json`
```json
{
  "name": "my-shop 디자인 시스템",
  "version": "1.0.0",
  "font": { "family": "Pretendard", "source": "assets/fonts/Pretendard" },
  "brand": "#2563EB",
  "principles": [
    "값은 토큰 이름으로만 쓴다 — 색·간격·모서리·글자 크기·그림자에 원시값을 쓰지 않는다.",
    "한 화면에서 primary 행동(버튼)은 하나만.",
    "버튼·입력창·카드처럼 시스템에 있는 것은 새로 그리지 않고 컴포넌트 인스턴스로 쓴다.",
    "글자와 배경의 명도 대비는 4.5:1 이상."
  ],
  "rules": { "rawValues": "warn" }
}
```

### 4-2. 토큰 (기초값 → 의미 토큰)
```json
// tokens/primitives.tokens.json
{ "brand": { "600": { "$type": "color", "$value": "#2563EB" }, "…": {} },
  "gray":  { "500": { "$type": "color", "$value": "#6B7280" } } }

// tokens/color.tokens.json — 의미 토큰은 값 대신 기초값을 가리킨다
{ "color": {
    "primary": {
      "$type": "color", "$value": "{brand.600}",
      "$description": "가장 중요한 행동 1개(구매·저장·다음)의 버튼 배경, 강조 가격.",
      "$extensions": { "freegma": { "avoid": "긴 본문 글자, 넓은 배경 면." } }
    },
    "muted": {
      "$type": "color", "$value": "{gray.500}",
      "$description": "보조 설명·메타 정보(카테고리, 날짜).",
      "$extensions": { "freegma": { "avoid": "버튼 라벨, 꼭 읽어야 하는 정보." } }
    } } }

// tokens/spacing.tokens.json
{ "spacing": { "4": { "$type": "dimension", "$value": { "value": 16, "unit": "px" },
                      "$description": "카드 안 요소 사이, 모바일 화면 좌우 여백" } } }

// tokens/typography.tokens.json — 크기 단계 + 글자 스타일
{ "font": { "family": { "$type": "fontFamily", "$value": "Pretendard" },
            "xl": { "$type": "dimension", "$value": { "value": 28, "unit": "px" } } },
  "style": { "heading": {
      "$type": "typography",
      "$value": { "fontFamily": "{font.family}", "fontSize": "{font.xl}", "fontWeight": 700, "lineHeight": 1.3 },
      "$description": "페이지·섹션 제목." } } }
```
- **`$description`은 필수**(빈 값이면 검사 경고, §5-4 `MISSING_DESC`). AI가 고를 근거이기 때문이다.
- **`$type`은 토큰마다 쓴다**(그룹에서 물려받지 않음 — 파일만 봐도 타입을 알 수 있게). 쓰는 타입: `color`·`dimension`(`{value, unit: px|rem}`)·`fontFamily`·`fontWeight`·`number`·`typography`·`shadow`. 그룹·토큰 이름은 소문자·숫자·하이픈, 그룹에 쓸 수 있는 `$` 키는 `$description`뿐. 스키마: `packages/schema/src/tokens.ts`.
- 텍스트 노드는 `"textStyle": "{style.heading}"`로 글자 스타일을 참조한다. 크기·굵기를 따로 바꾸면 «스타일에서 벗어남» 표시(2차: 스타일 덮어쓰기 허용 범위).

### 4-3. 컴포넌트 `components/button.fg.json`
```json
{
  "id": "button", "name": "Button", "kind": "base",
  "props": {
    "label":    { "type": "text", "required": true },
    "variant":  { "type": "enum", "options": ["primary", "ghost", "inverse"], "default": "primary" },
    "size":     { "type": "enum", "options": ["md", "sm"], "default": "md" },
    "disabled": { "type": "boolean", "default": false }
  },
  "states": ["default", "pressed", "disabled"],
  "usage": {
    "use":   "사용자가 하는 행동 하나. primary는 화면에서 가장 중요한 행동 1개에만, 나머지는 ghost.",
    "avoid": "단순 페이지 이동 링크로 쓰지 않는다. 라벨은 «확인»보다 «장바구니 담기»처럼 동사로.",
    "a11y":  "높이 최소 44pt(모바일) · 40px(웹). 아이콘만 있으면 접근성 이름 필수.",
    "limits": { "perScreen": { "variant=primary": 1 } }
  },
  "code": { "import": "@/components/ui/button", "name": "Button",
            "props": { "variant": "$variant", "size": "$size", "disabled": "$disabled", "children": "$label" } },
  "tree": { "id": "n_b001", "type": "frame", "…": "원본 노드 트리 (design.md §3 노드 형식)" }
}
```
- `usage.limits`는 기계가 검사할 수 있는 규칙만 넣는다(예: 화면당 primary 1개). 나머지 문장은 AI가 읽는 설명이다.
- `variants`가 enum 속성 하나와 같으면 따로 적지 않고 그 속성을 쓴다(`variant`).

## 5. AI가 정확히 이해하게
### 5-1. 무엇을 하면 AI가 헷갈리지 않나
| 헷갈리는 이유 | 이렇게 막는다 |
|---|---|
| 같은 파란색이 `blue.600`, `primary`, `#2563EB` 세 이름으로 있다 | 디자인에서 쓸 수 있는 이름은 **의미 토큰 하나**. 기초값을 노드에 쓰면 경고 |
| 이름만으로 용도를 모른다(`color.muted`를 버튼 라벨에) | 모든 토큰·스타일·컴포넌트에 «용도 / 피할 곳» 문장 |
| 글자 크기·굵기 조합을 매번 새로 고른다 | 글자는 **글자 스타일 5개 중 하나**로 |
| 버튼을 프레임으로 새로 그린다 | 기본 컴포넌트 목록과 «있는 컴포넌트는 인스턴스로» 규칙, 비슷하게 생긴 프레임 검사 |
| 화면마다 primary 버튼이 여러 개 | 컴포넌트 `usage.limits`로 기계 검사 |
| 시스템이 커서 다 읽으면 토큰 낭비 | `get_design_system`은 **요약**(이름·용도 중심, 좌표·원본 트리 없음). 자세한 건 `get_components`·`get_tokens`로 |

### 5-2. MCP 도구 (design.md §6 표에 추가·변경)
| 도구 | 하는 일 |
|---|---|
| `get_design_system` **(새로)** | 시스템 요약: 원칙, AI 규칙, 의미 토큰(이름 = 참조(값) # 용도 \| 피할 곳), 간격·모서리·그림자 단계, 글자 스타일, 컴포넌트(속성·쓸 때·피할 때·접근성). **AI가 디자인을 시작할 때 먼저 부르도록** MCP 서버 설명(instructions)에 적는다 |
| `get_tokens` / `set_tokens` | `$description`·`avoid`까지 읽고 쓴다. 의미 토큰을 만들 때 `$value`는 기초값 참조만 허용 |
| `get_components` | 속성·변형·상태·`usage`를 함께 돌려준다 |
| `update_components` **(새로)** | 컴포넌트의 속성·변형·`usage`를 고친다(원본 트리 편집은 `update_nodes`로) |
| `scan_repo_values` **(새로)** | 가져오기 전용. 서비스 저장소의 색·간격·모서리·글자 크기·그림자 값을 집계(값·횟수·쓰인 요소·위치). 읽기만, 결정적 |
| `get_import_draft` / `finish_import` **(새로)** | 가져오기 모드의 초안 읽기, 출처·확신도·옮기지 못한 것과 함께 초안 제출 |
| `lint` | §5-4 규칙 전부. 결과마다 `code`·`path`·`suggest`(바꿀 토큰·스타일·컴포넌트) |
| `create_nodes` / `update_nodes` | 쓰기 전에 §5-4 검사. `rules.rawValues`에 따라 경고 후 반영 또는 거절 |

`get_design_system` 응답 예(요약, 목업의 [AI가 읽는 형태 보기]와 같은 내용):
```
# get_design_system → my-shop 디자인 시스템 v1.0.0
platform: web   units: px   font: Pretendard
rules:
  rawValues: warn   # 토큰 밖 원시값 → 경고 후 반영
  - 값은 토큰 이름으로만 쓴다 …
  - 기초값(brand.*, gray.* …)은 노드에 쓰지 않는다 → 의미 토큰
color:   # 이름 = 참조 (값)  # 용도 | 피할 곳
  color.primary    = brand.600 (#2563EB)  # 가장 중요한 행동 1개의 버튼 배경 … | 피하기: 긴 본문 글자 …
  color.muted      = gray.500  (#6B7280)  # 보조 설명·메타 정보 | 피하기: 버튼 라벨 …
spacing: 1=4 2=8 3=12 4=16 5=20 6=24 8=32 12=48   # 4의 배수, gap·padding에만
type:
  heading  = font.xl(28)/700/1.3  # 페이지·섹션 제목.
components:   # * = 필수
  button  (기본)  label*, variant[primary|ghost|inverse]=primary, size[md|sm]=md, disabled=false
    use:   사용자가 하는 행동 하나. primary는 화면에서 가장 중요한 행동 1개에만 …
    avoid: 단순 페이지 이동 링크로 쓰지 않는다 …
```

### 5-3. `DESIGN_SYSTEM.md` (MCP 없이 저장소만 읽는 AI용)
- 앱이 시스템 파일을 저장할 때마다 `get_design_system`과 같은 내용을 마크다운으로 `freegma/system/DESIGN_SYSTEM.md`에 쓴다. 맨 위에 «이 파일은 자동 생성. 고치려면 freegma 디자인 시스템 화면이나 `system/` 파일을» 한 줄.
- 저장소 루트 `CLAUDE.md`·`AGENTS.md`에 «디자인 작업 전 `freegma/system/DESIGN_SYSTEM.md`를 읽을 것» 한 줄을 넣자고 프로젝트 만들 때 **제안**한다(앱이 서비스 코드 쪽 파일을 직접 고치지 않는다, design.md §12).
- 커밋 대상에 포함한다(코드 리뷰에서 시스템 변경이 읽히는 글로 보이도록).

### 5-4. 검사 규칙
| 코드 | 검사 | AI 쓰기 시 | 사람 편집 시 |
|---|---|---|---|
| `RAW_VALUE` | 색·간격·모서리·글자 크기·그림자에 토큰이 아닌 값 | `rules.rawValues`: **warn**(반영 + 가까운 토큰 제안) / **reject**(반영 안 함) | 속성 패널에 회색 칩(원시값) + 제안 |
| `OFF_SCALE` | 간격·모서리 값이 단계에 없음(14, 18…) | `RAW_VALUE`와 같은 처리, 가까운 두 단계 제안 | 표시 |
| `PRIMITIVE_REF` | 노드가 기초값(`{brand.600}`)을 직접 참조 | 항상 경고, 같은 값을 가리키는 의미 토큰 제안 | 표시 |
| `TYPE_STYLE` | 글자 크기·굵기·줄 높이가 어떤 글자 스타일과도 안 맞음 | 경고, 가장 가까운 스타일 제안 | 표시 |
| `LOOKALIKE` | 기본 컴포넌트와 비슷한 프레임(예: 라벨 하나 + 배경 + 모서리 = Button) | 경고, «Button 인스턴스로 바꾸기» 제안 | 표시 |
| `USAGE_LIMIT` | 컴포넌트 `usage.limits` 위반(화면당 primary 2개) | 경고 | 표시 |
| `MISSING_DESC` | 토큰·스타일·컴포넌트에 용도 설명 없음 | 경고(시스템을 고칠 때) | 시스템 화면에 표시 |

응답 형식 — AI가 스스로 고칠 수 있게 경로·이유·제안을 준다:
```js
// warn
{ ok: true, warnings: [
  { path: "n_8k2m.fill", value: "#3B82F6", code: "RAW_VALUE", suggest: ["color.primary"] },
  { path: "n_8k2m.layout.gap", value: 14, code: "OFF_SCALE", suggest: ["spacing.3", "spacing.4"] } ] }
// reject
{ ok: false, error: "RAW_VALUE", message: "이 프로젝트는 토큰 이름만 받습니다 (rules.rawValues = reject)",
  fix: [ { path: "n_8k2m.fill", use: "color.primary" }, { path: "n_8k2m.layout.gap", use: "spacing.3 | spacing.4" } ] }
```
- «가까운 토큰»: 색은 같은 의미 토큰 계산값과의 색 차이(ΔE)가 가장 작은 것, 크기는 수치 차이가 가장 작은 두 단계. 결정적으로 계산한다(AI 없이).

### 5-5. AI의 권장 작업 순서 (MCP 서버 instructions와 `DESIGN_SYSTEM.md` 맨 위에 적는다)
터미널 Claude Code든 앱 안 ✦ AI 탭(design.md §2-6)이든 같은 순서·같은 검사를 거친다. 규칙에 걸리면 고치지 않고 이유를 답한다(예: «primary는 화면당 1개라 바꾸지 않았어요»).
1. `get_design_system`으로 시스템을 읽는다.
2. 화면은 기본·서비스 컴포넌트 인스턴스와 의미 토큰·글자 스타일로만 만든다.
3. 시스템에 없는 것이 필요하면 **화면에 원시값을 쓰지 말고** 시스템에 먼저 추가한다(`set_tokens`·`update_components`) — 사람이 커밋 창에서 `design(system)` 변경으로 확인한다.
4. `render_image`로 결과를 보고, `lint`로 검사한 뒤 끝낸다.

## 6. 커밋·버전
- 시스템 변경은 커밋 메시지 본문의 **«디자인 시스템»** 묶음에 모인다(개정 1의 «토큰»·«컴포넌트» 묶음을 합침). 시스템만 바뀌면 첫 줄 범위는 `design(system)`.
  ```
  design(system): color.primary, spacing.6 변경

  디자인 시스템
  - color.primary: #3B82F6 → #2563EB
  - spacing.6: 24 → 28
  - button 사용 규칙: 설명 수정
  ```
- 값이 바뀐 토큰은 전·후 값을, 설명만 바뀐 것은 «설명 수정»을 쓴다.
- `system.json`의 `version`은 1차에서는 사람이 올린다(시스템 화면 개요에서). 2차: 변경 종류로 SemVer 제안(토큰 삭제·이름 변경 = major, 추가 = minor, 값·설명 = patch).

## 7. 결정과 범위
### 7-1. 이 문서에서 정한 것 (제안 — 확인 필요)
| # | 항목 | 안 | 이유 |
|---|---|---|---|
| 1 | AI 원시값 처리 기본값 | **경고 후 반영**(`warn`), 프로젝트 설정으로 `reject` 선택 | 처음부터 거절하면 AI 작업이 자주 멈춘다. 시스템이 안정되면 `reject`로 올리는 흐름 |
| 2 | 기본 컴포넌트 | Button · Input · Badge · Card | 거의 모든 화면에 나오는 것만. 나머지는 서비스 컴포넌트 |
| 3 | 파일 위치 | `freegma/tokens`·`freegma/components` → `freegma/system/` | 시스템과 화면을 폴더로 분리 |
| 4 | 시스템 개수 | 프로젝트당 하나 | 1차 범위를 작게. 여러 브랜드는 2차 |
| 5 | `DESIGN_SYSTEM.md` | 자동 생성 + 커밋 | MCP 없이 읽는 AI와 코드 리뷰를 위해 |
| 6 | 시작 방식 | 기본 템플릿 / 저장소에서 가져오기(Claude 필요). 빈 시스템 없음 | 빈 시스템은 AI가 원시값을 지어내게 만듦. 가져오기는 형식 차이 때문에 규칙 변환 대신 Claude가 다시 만듦 |

### 7-2. 1차 범위 밖(2차)
- 다크 모드 등 **테마(모드별 값)**: DTCG의 모드/테마 확장 확정 후 `color.*`에 모드별 값.
- 여러 브랜드·여러 시스템, 다른 저장소의 시스템을 패키지로 가져다 쓰기.
- 시스템 버전 자동 제안·변경 기록 화면, 시스템 변경의 시각 비교(전/후 견본).
- 컴포넌트 변형 편집 UI(design.md §13과 같음), 글자 스타일 덮어쓰기 허용 범위.

### 7-3. 남은 확인
| # | 확인할 것 | 시점 |
|---|---|---|
| 1 | `get_design_system` 요약이 실제 서비스 규모(토큰 80개, 컴포넌트 30개)에서 몇 토큰인가 — 목표 4k 이하, 넘으면 컴포넌트는 이름·한 줄만 | 구현 4단계 |
| 2 | AI(Claude Code)가 요약만 읽고 원시값 없이 화면을 만드는가 — 같은 요청 10회 `lint` 경고 수 측정 | 구현 4단계 |
| 3 | Claude 가져오기가 흔한 구성(Tailwind 4 `@theme`, shadcn, Expo 테마, 테마 없이 값이 흩어진 저장소)에서 사람이 고칠 항목 5개 이하인 초안을 내는가, 걸리는 시간·토큰 | 구현 4단계 |
| 4 | `LOOKALIKE` 검사의 오탐 비율 | 구현 4단계 |
