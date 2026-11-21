import { z } from 'zod';
import { FrameNode } from './node.ts';
import { ComponentId } from './values.ts';

// freegma/system/components/*.fg.json — 컴포넌트 원본 + 속성·변형·상태 + 사용 규칙 + 코드 연결
// (design-system.md §4-3, design.md §7 컴포넌트 연결)

const PropName = z
  .string()
  .regex(/^[a-z][A-Za-z0-9]*$/, '속성 이름은 소문자로 시작 (예: label, isOpen)');

const common = { required: z.boolean().optional(), description: z.string().optional() };

export const PropDef = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), ...common, default: z.string().optional() }),
  z.strictObject({ type: z.literal('boolean'), ...common, default: z.boolean().optional() }),
  z.strictObject({
    type: z.literal('number'),
    ...common,
    default: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.strictObject({
    type: z.literal('enum'),
    ...common,
    options: z.array(z.string().min(1)).min(1),
    default: z.string().optional(),
  }),
]);
export type PropDef = z.infer<typeof PropDef>;

export const ComponentFile = z
  .strictObject({
    id: ComponentId,
    /** 코드와 같은 표시 이름 (예: Button, ProductCard) */
    name: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, '표시 이름은 PascalCase (예: ProductCard)'),
    /** base: 프로젝트 만들 때 생기는 기본 컴포넌트 · service: 서비스에 맞게 조립한 것 */
    kind: z.enum(['base', 'service']),
    props: z.record(PropName, PropDef),
    states: z.array(z.string().min(1)).optional(),
    usage: z.strictObject({
      use: z.string().min(1, '«쓸 때»는 비울 수 없다 — AI가 고를 근거'),
      avoid: z.string().optional(),
      a11y: z.string().optional(),
      /** 기계가 검사하는 규칙 — perScreen: { "variant=primary": 1 } (화면당 최대 개수) */
      limits: z
        .strictObject({
          perScreen: z.record(
            z.string().regex(/^[a-z][A-Za-z0-9]*=[^=]+$/, '«속성=값» 꼴'),
            z.number().int().positive(),
          ),
        })
        .optional(),
    }),
    code: z
      .strictObject({
        import: z.string().min(1),
        name: z.string().min(1),
        /** 코드 props ← 디자인 props. "$label"은 디자인 속성 label 값 */
        props: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    /** 원본 노드 트리 */
    tree: FrameNode,
  })
  .superRefine((c, ctx) => {
    const err = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    for (const [name, p] of Object.entries(c.props)) {
      if (p.type === 'enum' && p.default !== undefined && !p.options.includes(p.default)) {
        err(['props', name, 'default'], `기본값 «${p.default}»이 options에 없다`);
      }
    }
    for (const [target, src] of Object.entries(c.code?.props ?? {})) {
      const ref = /^\$([A-Za-z0-9]+)$/.exec(src)?.[1];
      if (ref !== undefined && !(ref in c.props)) {
        err(['code', 'props', target], `«$${ref}»는 없는 속성`);
      }
    }
    for (const key of Object.keys(c.usage.limits?.perScreen ?? {})) {
      const [prop = '', value = ''] = key.split('=');
      const def = c.props[prop];
      if (def === undefined) err(['usage', 'limits', 'perScreen', key], `«${prop}»는 없는 속성`);
      else if (def.type === 'enum' && !def.options.includes(value)) {
        err(['usage', 'limits', 'perScreen', key], `«${value}»는 ${prop}의 options에 없다`);
      }
    }
  });
export type ComponentFile = z.infer<typeof ComponentFile>;
