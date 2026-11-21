import { expect } from 'vitest';
import type { Validation } from './issues.ts';

// 테스트 도우미 — 검증 결과에서 경로만 뽑는다

/** 통과해야 한다 (실패하면 경로를 보여 준다) */
export function expectOk(result: Validation<unknown>): void {
  expect(result.ok ? [] : result.issues).toEqual([]);
}

/** 실패해야 하고, 틀린 경로 목록을 돌려준다 */
export function pathsOf(result: Validation<unknown>): string[] {
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues.map((i) => i.path);
}
