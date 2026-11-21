import { z } from 'zod';
import { ColorValue, DimensionValue, TokenRef } from './values.ts';

// 채우기·선·모서리·그림자·텍스트 스타일 (design.md §2-2, design-system.md §4-2)

/** 선: 색 + 두께(기본 1) + 그릴 면(없으면 네 면) */
export const Stroke = z.strictObject({
  color: ColorValue,
  width: DimensionValue.optional(),
  sides: z
    .array(z.enum(['top', 'right', 'bottom', 'left']))
    .min(1)
    .optional(),
});
export type Stroke = z.infer<typeof Stroke>;

/** 모서리: 하나(네 모서리 같음) · [왼위, 오른위, 오른아래, 왼아래] */
export const Radius = z.union([
  DimensionValue,
  z.tuple([DimensionValue, DimensionValue, DimensionValue, DimensionValue]),
]);
export type Radius = z.infer<typeof Radius>;

/** 상자 모양 스타일 — frame·rect가 쓴다 */
export const BoxStyle = {
  fill: ColorValue.optional(),
  stroke: Stroke.optional(),
  radius: Radius.optional(),
  /** 그림자는 토큰으로만 (예: {shadow.md}) */
  shadow: TokenRef.optional(),
};

/** 글자 굵기 100~900 (100 단위) */
export const FontWeight = z
  .number()
  .int()
  .refine((w) => w >= 100 && w <= 900 && w % 100 === 0, '굵기는 100~900, 100 단위');

/** 텍스트 스타일 — 글자 스타일 토큰(textStyle)을 쓰고, 따로 바꾼 값만 덮어쓴다 */
export const TextStyle = {
  /** 글자 스타일 토큰 (예: {style.heading}) */
  textStyle: TokenRef.optional(),
  size: DimensionValue.optional(),
  weight: FontWeight.optional(),
  /** 줄 높이 배수 (예: 1.5) */
  lineHeight: z.number().positive().optional(),
  color: ColorValue.optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
};
