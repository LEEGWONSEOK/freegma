import { z } from 'zod';
import { Platform, RepoPath } from './project.ts';

// freegma/spec.json — 개발 스펙 프로필 (design.md §7, §2-7, spec.md §8 라우터 감지)

const WEB_TARGETS = ['react', 'vue'] as const;
const MOBILE_TARGETS = ['react-native', 'flutter', 'swiftui', 'compose'] as const;

export const SpecProfile = z
  .strictObject({
    platform: Platform,
    target: z.enum([...WEB_TARGETS, ...MOBILE_TARGETS]),
    language: z.enum(['typescript', 'javascript', 'dart', 'swift', 'kotlin']).optional(),
    /** 스타일 방식 (예: tailwind@4, css-modules, stylesheet, nativewind) */
    styling: z.string().min(1).optional(),
    components: z
      .strictObject({
        /** 컴포넌트 라이브러리 (예: shadcn) */
        library: z.string().min(1).optional(),
        dir: RepoPath,
      })
      .optional(),
    tokens: z
      .strictObject({
        output: RepoPath,
        format: z.enum(['css-vars', 'tailwind-theme', 'ts-object', 'json']),
      })
      .optional(),
    router: z
      .strictObject({
        kind: z.enum(['react-router', 'next-app', 'expo-router', 'none']),
        /** 라우트를 등록하는 파일 (파일 기반 라우터면 없음) */
        file: RepoPath.optional(),
      })
      .optional(),
    /** 팀 코드 규칙 문서 */
    conventions: RepoPath.optional(),
  })
  .superRefine((s, ctx) => {
    const ok = (s.platform === 'web' ? WEB_TARGETS : MOBILE_TARGETS) as readonly string[];
    if (!ok.includes(s.target)) {
      ctx.addIssue({
        code: 'custom',
        path: ['target'],
        message: `${s.platform} 플랫폼에서 쓸 수 없는 target (가능: ${ok.join(', ')})`,
      });
    }
  });
export type SpecProfile = z.infer<typeof SpecProfile>;
