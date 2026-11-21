import { z } from 'zod';
import { FrameNode } from './node.ts';
import { NodeId } from './values.ts';

// freegma/project.json 과 freegma/screens/*.fg.json (design.md §2-7, §3)

/** 지금 앱이 쓰는 파일 포맷 버전. 올릴 때는 schema/migrations에 변환을 더한다(T1-8) */
export const FORMAT_VERSION = 1;

export const Platform = z.enum(['web', 'mobile']);
export type Platform = z.infer<typeof Platform>;

/** 도메인 이름 — 화면의 꼬리표(상품·주문·마이 …), 한국어 허용 */
export const DomainName = z.string().min(1).max(40);

/** freegma/project.json */
export const ProjectFile = z.strictObject({
  formatVersion: z.number().int().positive(),
  name: z.string().min(1),
  platform: Platform,
  /** 왼쪽 화면 목록의 도메인 순서. 여기 없는 도메인은 뒤에 이름순 */
  domains: z.array(DomainName).optional(),
  /** 프로토타입 시작 화면 */
  startScreen: NodeId.optional(),
});
export type ProjectFile = z.infer<typeof ProjectFile>;

/** 라우트 — /로 시작, 동적 구간은 :id 또는 [id] */
export const Route = z
  .string()
  .regex(
    /^\/([A-Za-z0-9._~-]+|:[A-Za-z][A-Za-z0-9]*|\[[A-Za-z][A-Za-z0-9]*\])?(\/([A-Za-z0-9._~-]+|:[A-Za-z][A-Za-z0-9]*|\[[A-Za-z][A-Za-z0-9]*\]))*$/,
    '라우트는 /로 시작하는 경로 (예: /coupons, /products/:id)',
  );

/** 저장소 안 상대 경로 — 앞에 /나 ..가 없어야 한다 */
export const RepoPath = z
  .string()
  .min(1)
  .refine(
    (p) => !p.startsWith('/') && !p.split('/').includes('..') && !p.includes('\\'),
    '저장소 안 상대 경로여야 한다 (/, .., \\ 금지)',
  );

/**
 * 화면 파일의 최상위 프레임 — 노드 프레임 + 화면 칸.
 * role 'screen': 라우트 = 코드 파일 하나 / 'draft': draftOf가 가리키는 화면의 시안 / 없음: 작업용
 */
export const ScreenFrame = FrameNode.extend({
  role: z.enum(['screen', 'draft']).optional(),
  route: Route.optional(),
  domain: DomainName.optional(),
  code: z.strictObject({ file: RepoPath }).optional(),
  draftOf: NodeId.optional(),
}).superRefine((f, ctx) => {
  const need = (cond: boolean, path: string, message: string) => {
    if (!cond) ctx.addIssue({ code: 'custom', path: [path], message });
  };
  if (f.role === 'screen') {
    need(f.route !== undefined, 'route', '화면(role: screen)은 route가 있어야 한다');
    need(f.draftOf === undefined, 'draftOf', 'draftOf는 시안(role: draft)에만');
  } else if (f.role === 'draft') {
    need(f.draftOf !== undefined, 'draftOf', '시안(role: draft)은 draftOf가 있어야 한다');
    need(f.route === undefined, 'route', '시안은 코드로 가지 않으므로 route를 두지 않는다');
    need(f.code === undefined, 'code', '시안은 코드로 가지 않으므로 code를 두지 않는다');
  } else {
    need(f.route === undefined, 'route', 'route는 화면(role: screen)에만');
    need(f.code === undefined, 'code', 'code는 화면(role: screen)에만');
    need(f.draftOf === undefined, 'draftOf', 'draftOf는 시안(role: draft)에만');
  }
});
export type ScreenFrame = z.infer<typeof ScreenFrame>;
