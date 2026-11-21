import { z } from 'zod';
import { HexColor } from './values.ts';

// freegma/system/system.json — 디자인 시스템 개요·원칙·AI 규칙 (design-system.md §4-1)

export const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/, '버전은 1.0.0 꼴 (SemVer)');

export const SystemFile = z.strictObject({
  name: z.string().min(1),
  version: SemVer,
  font: z.strictObject({
    family: z.string().min(1),
    /** 프로젝트에 넣은 서체 폴더 (예: assets/fonts/Pretendard) */
    source: z
      .string()
      .regex(/^assets\/fonts\/[^/\\]+$/, '서체는 assets/fonts/ 아래 폴더')
      .optional(),
  }),
  /** 브랜드 대표 색 — brand.50~900 단계를 만드는 기준 */
  brand: HexColor,
  principles: z.array(z.string().min(1)),
  rules: z.strictObject({
    /** AI가 토큰 밖 원시값을 보냈을 때: warn(경고 후 반영) · reject(거절) — design-system.md §5-4 */
    rawValues: z.enum(['warn', 'reject']),
  }),
});
export type SystemFile = z.infer<typeof SystemFile>;
