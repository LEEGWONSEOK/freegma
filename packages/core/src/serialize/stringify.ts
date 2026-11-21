import { round2 } from './number.ts';
import { type FileKind, NODE, type ObjectShape, SHAPES, type Shape, TOKEN } from './shapes.ts';

// 안정된 출력 (spec §5): 같은 디자인 → 항상 같은 바이트.
// 키 순서는 모양(shapes.ts)대로, 2칸 들여쓰기, 숫자 소수 둘째 자리, 기본값 생략, 끝 줄바꿈 1개.
// 글자·숫자만 든 배열은 한 줄로(예: "pad": ["{spacing.3}", 48]) — diff가 작게.

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isEmpty = (v: unknown): boolean =>
  (Array.isArray(v) && v.length === 0) || (isPlainObject(v) && Object.keys(v).length === 0);

/** 모양에 맞춰 키를 정렬하고 기본값·undefined·빈 배열/객체를 뺀 새 값 */
function normalize(value: unknown, shape: Shape | undefined): Json {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return round2(value);
  if (Array.isArray(value)) {
    const of = shape?.kind === 'array' ? shape.of : undefined;
    return value.map((v) => normalize(v, of));
  }
  if (!isPlainObject(value)) throw new TypeError(`직렬화할 수 없는 값: ${String(value)}`);

  if (shape?.kind === 'node') return orderObject(value, NODE);
  if (shape?.kind === 'tokens') return tokenTree(value);
  if (shape?.kind === 'record') {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = normalize(v, shape.of);
    }
    return out;
  }
  if (shape?.kind === 'object') return orderObject(value, shape);
  // 모양을 모르는 객체: 이름순 (결정적이도록)
  return orderObject(value, { kind: 'object', keys: [] });
}

function orderObject(value: Record<string, unknown>, shape: ObjectShape): Json {
  const known = shape.keys.filter((k) => k in value);
  const rest = Object.keys(value)
    .filter((k) => !shape.keys.includes(k))
    .sort();
  const out: Record<string, Json> = {};
  for (const key of [...known, ...rest]) {
    const v = value[key];
    if (v === undefined) continue;
    if (shape.defaults && key in shape.defaults && Object.is(shape.defaults[key], v)) continue;
    const n = normalize(v, shape.fields?.[key]);
    if (isEmpty(n) && (key === 'children' || key === 'props')) continue;
    out[key] = n;
  }
  return out;
}

/** 토큰 나무: 그룹은 $description 먼저, 나머지는 넣은 순서 / 토큰은 TOKEN 순서 */
function tokenTree(value: Record<string, unknown>): Json {
  if ('$value' in value) return orderObject(value, TOKEN);
  const out: Record<string, Json> = {};
  if (typeof value.$description === 'string') out.$description = value.$description;
  for (const [k, v] of Object.entries(value)) {
    if (k === '$description' || v === undefined) continue;
    out[k] = isPlainObject(v) ? tokenTree(v) : normalize(v, undefined);
  }
  return out;
}

const INDENT = '  ';

function write(value: Json, depth: number): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const pad = INDENT.repeat(depth + 1);
  const end = INDENT.repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => v === null || typeof v !== 'object')) {
      return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
    }
    return `[\n${value.map((v) => pad + write(v, depth + 1)).join(',\n')}\n${end}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  const lines = entries.map(([k, v]) => `${pad}${JSON.stringify(k)}: ${write(v, depth + 1)}`);
  return `{\n${lines.join(',\n')}\n${end}}`;
}

/** 파일 종류에 맞춰 안정된 JSON 문자열로 (끝 줄바꿈 1개) */
export function serialize(kind: FileKind, value: unknown): string {
  return `${write(normalize(value, SHAPES[kind]), 0)}\n`;
}
