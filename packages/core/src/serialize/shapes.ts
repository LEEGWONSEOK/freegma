// 파일 종류별 «모양» — 키 순서와 생략할 기본값 (spec §5 직렬화)
// 사전순이 아니라 «id, type, name, 레이아웃, 스타일, children»처럼 읽기 좋은 순서.

/** 구조 객체: 키 순서가 정해져 있다. 목록에 없는 키는 뒤에 이름순 */
export type ObjectShape = {
  kind: 'object';
  keys: readonly string[];
  /** 이 값이면 쓰지 않는다 */
  defaults?: Readonly<Record<string, unknown>>;
  /** 칸마다 안쪽 모양 */
  fields?: Readonly<Record<string, Shape>>;
};
/** 맵(사용자가 정한 이름 → 값): 넣은 순서를 지킨다 (props 이름, 토큰 이름 …) */
export type RecordShape = { kind: 'record'; of?: Shape };
/** 배열: 원소마다 같은 모양 */
export type ArrayShape = { kind: 'array'; of?: Shape };
/** 토큰 파일의 그룹/토큰 나무 */
export type TokenTreeShape = { kind: 'tokens' };
/** 노드 — 재귀라 따로 표시 */
export type NodeShape = { kind: 'node' };

export type Shape = ObjectShape | RecordShape | ArrayShape | TokenTreeShape | NodeShape;

const obj = (
  keys: readonly string[],
  fields?: ObjectShape['fields'],
  defaults?: ObjectShape['defaults'],
): ObjectShape => ({
  kind: 'object',
  keys,
  ...(fields ? { fields } : {}),
  ...(defaults ? { defaults } : {}),
});

const LAYOUT = obj(['dir', 'gap', 'pad', 'align', 'justify', 'wrap'], undefined, { wrap: false });
const STROKE = obj(['color', 'width', 'sides'], undefined, { width: 1 });

/** 노드 칸 순서 — 화면 칸(role…)은 화면 파일의 최상위에만 있다 */
export const NODE_KEYS = [
  'id',
  'type',
  'name',
  'role',
  'route',
  'domain',
  'draftOf',
  'code',
  'of',
  'props',
  'hidden',
  'locked',
  'x',
  'y',
  'w',
  'h',
  'layout',
  'clip',
  'fill',
  'stroke',
  'radius',
  'shadow',
  'opacity',
  'src',
  'fit',
  'alt',
  'text',
  'textStyle',
  'size',
  'weight',
  'lineHeight',
  'color',
  'align',
  'children',
] as const;

export const NODE = obj(
  NODE_KEYS,
  {
    layout: LAYOUT,
    stroke: STROKE,
    code: obj(['file']),
    props: { kind: 'record' },
    children: { kind: 'array', of: { kind: 'node' } },
  },
  // 기본값: 숨김·잠금·자르기 false, 크기 모드 hug, 불투명도 1
  { hidden: false, locked: false, clip: false, w: 'hug', h: 'hug', opacity: 1 },
);

const PROP_DEF = obj(
  ['type', 'required', 'options', 'default', 'min', 'max', 'description'],
  undefined,
  {
    required: false,
  },
);

export const SHAPES = {
  project: obj(['formatVersion', 'name', 'platform', 'domains', 'startScreen']),
  spec: obj(
    ['platform', 'target', 'language', 'styling', 'components', 'tokens', 'router', 'conventions'],
    {
      components: obj(['library', 'dir']),
      tokens: obj(['output', 'format']),
      router: obj(['kind', 'file']),
    },
  ),
  system: obj(['name', 'version', 'font', 'brand', 'principles', 'rules'], {
    font: obj(['family', 'source']),
    rules: obj(['rawValues']),
  }),
  screen: { kind: 'node' },
  component: obj(['id', 'name', 'kind', 'props', 'states', 'usage', 'code', 'tree'], {
    props: { kind: 'record', of: PROP_DEF },
    usage: obj(['use', 'avoid', 'a11y', 'limits'], {
      limits: obj(['perScreen'], { perScreen: { kind: 'record' } }),
    }),
    code: obj(['import', 'name', 'props'], { props: { kind: 'record' } }),
    tree: { kind: 'node' },
  }),
  tokens: { kind: 'tokens' },
} as const satisfies Record<string, Shape>;

export type FileKind = keyof typeof SHAPES;

/** 토큰 하나의 칸 순서 */
export const TOKEN = obj(['$type', '$value', '$description', '$extensions'], {
  $value: obj([
    // dimension
    'value',
    'unit',
    // typography
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    // shadow
    'color',
    'offsetX',
    'offsetY',
    'blur',
    'spread',
    'inset',
  ]),
});
