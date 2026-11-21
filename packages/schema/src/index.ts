// @freegma/schema — zod 스키마: 노드·디자인 시스템·spec·project.json, 포맷 버전·변환
// spec.md §3. 의존 방향: .dependency-cruiser.json
import { ComponentFile } from './component.ts';
import { validate } from './issues.ts';
import { Node } from './node.ts';
import { ProjectFile, ScreenFrame } from './project.ts';
import { SpecProfile } from './spec.ts';
import { SystemFile } from './system.ts';

export const packageName = '@freegma/schema';

export { ComponentFile, PropDef } from './component.ts';
export type { Issue, Validation } from './issues.ts';
export { formatPath, validate } from './issues.ts';
export { AutoLayout, Padding } from './layout.ts';
export type { NodeType } from './node.ts';
export { FrameNode, ImageNode, InstanceNode, Node, RectNode, TextNode } from './node.ts';
export {
  DomainName,
  FORMAT_VERSION,
  Platform,
  ProjectFile,
  RepoPath,
  Route,
  ScreenFrame,
} from './project.ts';
export { SpecProfile } from './spec.ts';
export { BoxStyle, FontWeight, Radius, Stroke, TextStyle } from './style.ts';
export { SemVer, SystemFile } from './system.ts';
export type { Token, TokenGroup } from './tokens.ts';
export { listTokens, TokenType, validateTokenFile } from './tokens.ts';
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

/** 노드 하나(자식 포함) */
export const validateNode = (input: unknown) => validate(Node, input);
/** freegma/project.json */
export const validateProject = (input: unknown) => validate(ProjectFile, input);
/** freegma/screens/*.fg.json (최상위 프레임) */
export const validateScreen = (input: unknown) => validate(ScreenFrame, input);
/** freegma/spec.json */
export const validateSpec = (input: unknown) => validate(SpecProfile, input);
/** freegma/system/system.json */
export const validateSystem = (input: unknown) => validate(SystemFile, input);
/** freegma/system/components/*.fg.json */
export const validateComponent = (input: unknown) => validate(ComponentFile, input);
