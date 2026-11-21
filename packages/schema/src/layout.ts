import { z } from 'zod';
import { DimensionValue } from './values.ts';

// 오토 레이아웃 (design.md §2-2: 가로/세로, 간격, 패딩, 정렬)

/** 패딩: 하나(네 방향 같음) · [세로, 가로] · [위, 오른쪽, 아래, 왼쪽] */
export const Padding = z.union([
  DimensionValue,
  z.tuple([DimensionValue, DimensionValue]),
  z.tuple([DimensionValue, DimensionValue, DimensionValue, DimensionValue]),
]);
export type Padding = z.infer<typeof Padding>;

export const AutoLayout = z.strictObject({
  /** 방향: row(가로) · col(세로) */
  dir: z.enum(['row', 'col']),
  gap: DimensionValue.optional(),
  pad: Padding.optional(),
  /** 교차축 정렬 */
  align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
  /** 주축 정렬 */
  justify: z.enum(['start', 'center', 'end', 'space-between']).optional(),
  /** 넘치면 줄바꿈 */
  wrap: z.boolean().optional(),
});
export type AutoLayout = z.infer<typeof AutoLayout>;
