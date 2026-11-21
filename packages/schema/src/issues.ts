import type { z } from 'zod';

// 검증 오류를 «어느 경로가 왜 틀렸는지»로 바꾼다.
// MCP 쓰기 도구가 이 형태로 돌려줘서 AI가 스스로 고칠 수 있게 한다 (design.md §6 입력 검증).

export type Issue = {
  /** 예: `children[0].props.label` — 맨 위면 빈 문자열 */
  path: string;
  message: string;
};

export type Validation<T> = { ok: true; value: T } | { ok: false; issues: Issue[] };

/** zod 경로 배열 → `children[0].layout.gap` */
export function formatPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const key of path) {
    if (typeof key === 'number') out += `[${key}]`;
    else out += out === '' ? String(key) : `.${String(key)}`;
  }
  return out;
}

/** zod 스키마로 검증하고 결과를 Validation으로 돌려준다 */
export function validate<S extends z.ZodType>(schema: S, input: unknown): Validation<z.infer<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const issues: Issue[] = [];
  for (const issue of result.error.issues) {
    // 모르는 키는 그 키 자체를 경로로 — AI가 «어느 칸이 오타인지» 바로 알게
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        issues.push({ path: formatPath([...issue.path, key]), message: `모르는 키 «${key}»` });
      }
      continue;
    }
    issues.push({ path: formatPath(issue.path), message: issue.message });
  }
  return { ok: false, issues };
}
