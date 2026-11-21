import { z } from 'zod';

// 노드 속성 값에 쓰는 기본 타입 (design.md §3, design-system.md §4)
// 토큰에 연결된 값은 원시값이 아니라 토큰 이름으로 저장한다: "{color.primary}"

/** 토큰 참조 — `{그룹.이름}`, 소문자·숫자·하이픈. 예: `{color.primary}`, `{spacing.4}`, `{style.heading}` */
export const TokenRef = z
  .string()
  .regex(
    /^\{[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+\}$/,
    '토큰 참조는 {그룹.이름} 꼴이어야 한다 (예: {color.primary})',
  );
export type TokenRef = z.infer<typeof TokenRef>;

/** 원시 색 — #RGB, #RRGGBB, #RRGGBBAA. 토큰 밖 값이라 검사 규칙(RAW_VALUE)이 표시한다 */
export const HexColor = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    '색은 #RGB, #RRGGBB, #RRGGBBAA 꼴이어야 한다',
  );

/** 색 값: 토큰 참조 또는 원시 색 */
export const ColorValue = z.union([TokenRef, HexColor]);
export type ColorValue = z.infer<typeof ColorValue>;

/** 길이 값(px/pt): 토큰 참조 또는 0 이상의 숫자 */
export const DimensionValue = z.union([TokenRef, z.number().nonnegative()]);
export type DimensionValue = z.infer<typeof DimensionValue>;

/** 노드 id — `n_` + 4~21자 (nanoid 문자) */
export const NodeId = z
  .string()
  .regex(/^n_[0-9A-Za-z_-]{4,21}$/, '노드 id는 n_ 뒤에 4~21자 (예: n_8k2m)');
export type NodeId = z.infer<typeof NodeId>;

/** 컴포넌트 id — 소문자 슬러그 (예: button, product-card) */
export const ComponentId = z
  .string()
  .regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, '컴포넌트 id는 소문자 슬러그 (예: product-card)');

/** 크기 모드: 고정(숫자) · 채우기(fill) · 내용 맞춤(hug) */
export const SizeValue = z.union([z.number().nonnegative(), z.literal('fill'), z.literal('hug')]);
export type SizeValue = z.infer<typeof SizeValue>;

/** 프로젝트 안 이미지 경로 — `assets/` 아래 (design.md §3) */
export const AssetPath = z
  .string()
  .regex(/^assets\/[^/\\]+(\/[^/\\]+)*$/, '이미지는 assets/ 아래 경로여야 한다');
