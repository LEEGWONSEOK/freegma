import { z } from 'zod';
import { formatPath, type Issue, type Validation } from './issues.ts';
import { HexColor, TokenRef } from './values.ts';

// freegma/system/tokens/*.tokens.json — W3C Design Tokens(DTCG) 형식 (design-system.md §4-2)
// 그룹 안에 그룹·토큰이 섞이는 나무 구조라, 직접 걸어 내려가며 토큰마다 $type에 맞게 검사한다
// (zod union으로 하면 어느 경로가 틀렸는지가 흐려진다).

/** 다른 토큰 가리키기 — 노드의 토큰 참조와 같은 꼴 {그룹.이름} */
const Alias = TokenRef;
const Dimension = z.union([
  Alias,
  z.strictObject({ value: z.number(), unit: z.enum(['px', 'rem']) }),
]);
const ShadowLayer = z.strictObject({
  color: z.union([Alias, HexColor]),
  offsetX: Dimension,
  offsetY: Dimension,
  blur: Dimension,
  spread: Dimension,
  inset: z.boolean().optional(),
});

/** $type마다 $value 꼴 */
const VALUE_BY_TYPE = {
  color: z.union([Alias, HexColor]),
  dimension: Dimension,
  fontFamily: z.union([Alias, z.string().min(1), z.array(z.string().min(1)).min(1)]),
  fontWeight: z.union([Alias, z.number().int().min(1).max(1000)]),
  number: z.union([Alias, z.number()]),
  typography: z.union([
    Alias,
    z.strictObject({
      fontFamily: z.union([Alias, z.string().min(1)]),
      fontSize: Dimension,
      fontWeight: z.union([Alias, z.number().int().min(1).max(1000)]),
      lineHeight: z.union([Alias, z.number().positive()]),
      letterSpacing: Dimension.optional(),
    }),
  ]),
  shadow: z.union([Alias, ShadowLayer, z.array(ShadowLayer).min(1)]),
} as const;

export const TokenType = z.enum(
  Object.keys(VALUE_BY_TYPE) as [keyof typeof VALUE_BY_TYPE, ...(keyof typeof VALUE_BY_TYPE)[]],
);
export type TokenType = z.infer<typeof TokenType>;

/** 토큰 하나 — $type은 필수(그룹에서 물려받지 않음: 파일만 봐도 알 수 있게) */
const TokenShape = z.strictObject({
  $type: TokenType,
  $value: z.unknown(),
  /** 용도 — AI가 고를 근거. 비면 검사 규칙 MISSING_DESC가 경고(T4-10) */
  $description: z.string().optional(),
  $extensions: z
    .object({
      freegma: z.strictObject({ avoid: z.string().optional() }).optional(),
    })
    .optional(),
});

export type Token = {
  $type: TokenType;
  $value: unknown;
  $description?: string | undefined;
  $extensions?: { freegma?: { avoid?: string | undefined } | undefined } | undefined;
};
export type TokenGroup = {
  $description?: string;
  [name: string]: Token | TokenGroup | string | undefined;
};

/** 그룹·토큰 이름 — 소문자·숫자·하이픈 (예: primary, 600, 2xl) */
const NAME = /^[a-z0-9][a-z0-9-]*$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function walk(node: unknown, path: (string | number)[], issues: Issue[], isRoot: boolean): void {
  if (!isObject(node)) {
    issues.push({ path: formatPath(path), message: '그룹 또는 토큰(객체)이어야 한다' });
    return;
  }
  if ('$value' in node) {
    if (isRoot) issues.push({ path: '', message: '파일 맨 위는 그룹이어야 한다' });
    const shape = TokenShape.safeParse(node);
    if (!shape.success) {
      for (const i of shape.error.issues) {
        const keys = i.code === 'unrecognized_keys' ? i.keys : [undefined];
        for (const k of keys) {
          const p = [...path, ...i.path.map(String), ...(k ? [k] : [])];
          issues.push({ path: formatPath(p), message: k ? `모르는 키 «${k}»` : i.message });
        }
      }
      return;
    }
    const value = VALUE_BY_TYPE[shape.data.$type].safeParse(node.$value);
    if (!value.success) {
      issues.push({
        path: formatPath([...path, '$value']),
        message: `$type ${shape.data.$type}에 맞지 않는 값`,
      });
    }
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === '$description') {
      if (typeof child !== 'string')
        issues.push({ path: formatPath([...path, key]), message: '글자여야 한다' });
      continue;
    }
    if (!NAME.test(key)) {
      issues.push({
        path: formatPath([...path, key]),
        message: `이름 «${key}»은 소문자·숫자·하이픈만 (그룹에 쓸 수 있는 $ 키는 $description뿐)`,
      });
      continue;
    }
    walk(child, [...path, key], issues, false);
  }
}

/** 토큰 파일 하나를 검사한다 */
export function validateTokenFile(input: unknown): Validation<TokenGroup> {
  const issues: Issue[] = [];
  walk(input, [], issues, true);
  return issues.length ? { ok: false, issues } : { ok: true, value: input as TokenGroup };
}

/** 토큰 파일에서 «그룹.이름» → 토큰 목록을 뽑는다 (참조 확인·검사 규칙에서 씀) */
export function listTokens(file: TokenGroup): Map<string, Token> {
  const out = new Map<string, Token>();
  const go = (node: TokenGroup, prefix: string[]) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || !isObject(child)) continue;
      if ('$value' in child) out.set([...prefix, key].join('.'), child as Token);
      else go(child as TokenGroup, [...prefix, key]);
    }
  };
  go(file, []);
  return out;
}
