// @freegma/core — 문서 모델, 편집 명령(op), 되돌리기, 직렬화, 프로젝트 읽기·쓰기
// spec.md §3. 의존 방향: .dependency-cruiser.json
export const packageName = '@freegma/core';

export { round2 } from './serialize/number.ts';
export type { FileKind } from './serialize/shapes.ts';
export { serialize } from './serialize/stringify.ts';
