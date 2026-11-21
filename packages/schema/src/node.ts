import { z } from 'zod';
import { AutoLayout } from './layout.ts';
import { BoxStyle, TextStyle } from './style.ts';
import { AssetPath, ComponentId, NodeId, SizeValue } from './values.ts';

// 노드 (design.md §3) — frame · rect · text · image · instance
// 모르는 키는 거절한다(strictObject): AI가 오타를 내면 어디가 틀렸는지 바로 알려 주기 위해.
// 화면 프레임의 역할·라우트(role·route·domain·code·draftOf)는 화면 파일 스키마(T1-2)에서 더한다.
// 인터랙션(프로토타입)은 T8-1에서 더한다.

/** 모든 노드에 공통인 칸 */
const base = {
  id: NodeId,
  /** 레이어 이름 — 없으면 화면에 컴포넌트 이름·타입·글자 내용을 대신 보여 준다 */
  name: z.string().min(1, '이름이 비어 있다').optional(),
  /** 숨김 (기본 false) */
  hidden: z.boolean().optional(),
  /** 잠금 (기본 false) */
  locked: z.boolean().optional(),
  /** 부모에 오토 레이아웃이 없을 때만 쓰는 위치 */
  x: z.number().optional(),
  y: z.number().optional(),
  /** 크기 모드: 숫자(고정) · fill(채우기) · hug(내용 맞춤, 기본) */
  w: SizeValue.optional(),
  h: SizeValue.optional(),
  opacity: z.number().min(0).max(1).optional(),
};

export const RectNode = z.strictObject({
  type: z.literal('rect'),
  ...base,
  ...BoxStyle,
});

export const TextNode = z.strictObject({
  type: z.literal('text'),
  ...base,
  text: z.string(),
  ...TextStyle,
});

export const ImageNode = z.strictObject({
  type: z.literal('image'),
  ...base,
  src: AssetPath,
  fit: z.enum(['cover', 'contain', 'fill']).optional(),
  /** 대체 텍스트 (접근성) */
  alt: z.string().optional(),
  radius: BoxStyle.radius,
});

/** 컴포넌트 인스턴스 — props 값은 글자·숫자·참거짓만 */
export const InstanceNode = z.strictObject({
  type: z.literal('instance'),
  ...base,
  of: ComponentId,
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const frameFields = {
  type: z.literal('frame'),
  ...base,
  ...BoxStyle,
  layout: AutoLayout.optional(),
  /** 넘치는 자식 자르기 (기본 false) */
  clip: z.boolean().optional(),
};
const FrameNodeWithoutChildren = z.strictObject(frameFields);

// 재귀 타입은 TypeScript가 추론하지 못하므로 직접 선언한다
export interface FrameNode extends z.infer<typeof FrameNodeWithoutChildren> {
  children?: Node[] | undefined;
}
export type RectNode = z.infer<typeof RectNode>;
export type TextNode = z.infer<typeof TextNode>;
export type ImageNode = z.infer<typeof ImageNode>;
export type InstanceNode = z.infer<typeof InstanceNode>;
export type Node = FrameNode | RectNode | TextNode | ImageNode | InstanceNode;
export type NodeType = Node['type'];

export const FrameNode = z.strictObject({
  ...frameFields,
  children: z.array(z.lazy((): z.ZodType<Node> => Node)).optional(),
});

export const Node = z.discriminatedUnion('type', [
  FrameNode,
  RectNode,
  TextNode,
  ImageNode,
  InstanceNode,
]);
