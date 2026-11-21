// @freegma/schema — zod 스키마: 노드·디자인 시스템·spec·project.json, 포맷 버전·변환
// spec.md §3. 의존 방향: .dependency-cruiser.json
import { validate } from './issues.ts';
import { Node } from './node.ts';

export const packageName = '@freegma/schema';

export type { Issue, Validation } from './issues.ts';
export { formatPath, validate } from './issues.ts';
export { AutoLayout, Padding } from './layout.ts';
export type { NodeType } from './node.ts';
export { FrameNode, ImageNode, InstanceNode, Node, RectNode, TextNode } from './node.ts';
export { BoxStyle, FontWeight, Radius, Stroke, TextStyle } from './style.ts';
export {
  AssetPath,
  ColorValue,
  ComponentId,
  DimensionValue,
  HexColor,
  NodeId,
  SizeValue,
  TokenRef,
} from './values.ts';

/** 노드 하나(자식 포함)를 검증한다 */
export const validateNode = (input: unknown) => validate(Node, input);
