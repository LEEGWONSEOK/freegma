import { describe, expect, it } from 'vitest';
import { listTokens, validateComponent, validateSystem, validateTokenFile } from './index.ts';
import { expectOk, pathsOf } from './test-util.ts';

describe('system.json', () => {
  // design-system.md §4-1 예시
  const system = {
    name: 'my-shop 디자인 시스템',
    version: '1.0.0',
    font: { family: 'Pretendard', source: 'assets/fonts/Pretendard' },
    brand: '#2563EB',
    principles: ['값은 토큰 이름으로만 쓴다.', '한 화면에서 primary 행동(버튼)은 하나만.'],
    rules: { rawValues: 'warn' },
  };

  it('design-system.md §4-1 예시', () => expectOk(validateSystem(system)));

  it('틀린 예', () => {
    expect(pathsOf(validateSystem({ ...system, version: 'v1' }))).toEqual(['version']);
    expect(pathsOf(validateSystem({ ...system, rules: { rawValues: 'block' } }))).toEqual([
      'rules.rawValues',
    ]);
    expect(pathsOf(validateSystem({ ...system, brand: 'blue' }))).toEqual(['brand']);
  });
});

describe('토큰 파일 (DTCG)', () => {
  // design-system.md §4-2 예시들
  const primitives = {
    brand: { '600': { $type: 'color', $value: '#2563EB' } },
    gray: { '500': { $type: 'color', $value: '#6B7280' } },
  };
  const color = {
    color: {
      primary: {
        $type: 'color',
        $value: '{brand.600}',
        $description: '가장 중요한 행동 1개(구매·저장·다음)의 버튼 배경, 강조 가격.',
        $extensions: { freegma: { avoid: '긴 본문 글자, 넓은 배경 면.' } },
      },
      muted: { $type: 'color', $value: '{gray.500}', $description: '보조 설명·메타 정보.' },
    },
  };
  const spacing = {
    spacing: {
      '4': {
        $type: 'dimension',
        $value: { value: 16, unit: 'px' },
        $description: '카드 안 요소 사이',
      },
    },
  };
  const typography = {
    font: {
      family: { $type: 'fontFamily', $value: 'Pretendard' },
      xl: { $type: 'dimension', $value: { value: 28, unit: 'px' } },
    },
    style: {
      heading: {
        $type: 'typography',
        $value: {
          fontFamily: '{font.family}',
          fontSize: '{font.xl}',
          fontWeight: 700,
          lineHeight: 1.3,
        },
        $description: '페이지·섹션 제목.',
      },
    },
  };
  const shadow = {
    shadow: {
      md: {
        $type: 'shadow',
        $value: {
          color: '#1118271F',
          offsetX: { value: 0, unit: 'px' },
          offsetY: { value: 8, unit: 'px' },
          blur: { value: 24, unit: 'px' },
          spread: { value: 0, unit: 'px' },
        },
      },
    },
  };

  it('design-system.md §4-2 예시 다섯 파일', () => {
    for (const file of [primitives, color, spacing, typography, shadow]) {
      expectOk(validateTokenFile(file));
    }
  });

  it('토큰 목록 뽑기', () => {
    const r = validateTokenFile(typography);
    expect(r.ok && [...listTokens(r.value).keys()]).toEqual([
      'font.family',
      'font.xl',
      'style.heading',
    ]);
  });

  it('틀리면 그 토큰의 경로', () => {
    const bad = JSON.parse(JSON.stringify(color)) as typeof color;
    bad.color.primary.$value = 'blue';
    expect(pathsOf(validateTokenFile(bad))).toEqual(['color.primary.$value']);
    expect(
      pathsOf(validateTokenFile({ spacing: { '4': { $type: 'dimension', $value: '16px' } } })),
    ).toEqual(['spacing.4.$value']);
    expect(pathsOf(validateTokenFile({ color: { primary: { $value: '#000000' } } }))).toEqual([
      'color.primary.$type',
    ]);
    expect(pathsOf(validateTokenFile({ Color: {} }))).toEqual(['Color']);
    expect(
      pathsOf(validateTokenFile({ color: { a: { $type: 'color', $value: '#000', $desc: 'x' } } })),
    ).toEqual(['color.a.$desc']);
  });
});

describe('컴포넌트 파일', () => {
  // design-system.md §4-3 예시 (tree는 작게)
  const button = {
    id: 'button',
    name: 'Button',
    kind: 'base',
    props: {
      label: { type: 'text', required: true },
      variant: { type: 'enum', options: ['primary', 'ghost', 'inverse'], default: 'primary' },
      size: { type: 'enum', options: ['md', 'sm'], default: 'md' },
      disabled: { type: 'boolean', default: false },
    },
    states: ['default', 'pressed', 'disabled'],
    usage: {
      use: '사용자가 하는 행동 하나. primary는 화면에서 가장 중요한 행동 1개에만, 나머지는 ghost.',
      avoid: '단순 페이지 이동 링크로 쓰지 않는다.',
      a11y: '높이 최소 44pt(모바일) · 40px(웹).',
      limits: { perScreen: { 'variant=primary': 1 } },
    },
    code: {
      import: '@/components/ui/button',
      name: 'Button',
      props: { variant: '$variant', size: '$size', disabled: '$disabled', children: '$label' },
    },
    tree: {
      id: 'n_b001',
      type: 'frame',
      name: 'Button',
      layout: { dir: 'row', pad: ['{spacing.3}', '{spacing.5}'] },
      fill: '{color.primary}',
      radius: '{radius.md}',
      children: [
        { id: 'n_b002', type: 'text', name: 'label', text: '버튼', textStyle: '{style.body}' },
      ],
    },
  };

  it('design-system.md §4-3 예시', () => expectOk(validateComponent(button)));

  it('서로 맞지 않는 값', () => {
    const v = JSON.parse(JSON.stringify(button)) as typeof button;
    v.props.variant.default = 'danger';
    v.code.props.children = '$text';
    (v.usage.limits as { perScreen: Record<string, number> }).perScreen = { 'variant=danger': 1 };
    expect(pathsOf(validateComponent(v))).toEqual([
      'props.variant.default',
      'code.props.children',
      'usage.limits.perScreen.variant=danger',
    ]);
  });

  it('틀린 꼴', () => {
    expect(pathsOf(validateComponent({ ...button, name: 'button' }))).toEqual(['name']);
    expect(pathsOf(validateComponent({ ...button, kind: 'core' }))).toEqual(['kind']);
    expect(pathsOf(validateComponent({ ...button, usage: { use: '' } }))).toEqual(['usage.use']);
    expect(
      pathsOf(
        validateComponent({ ...button, props: { Label: { type: 'text' } }, code: undefined }),
      ),
    ).toEqual(['props.Label']);
    expect(
      pathsOf(validateComponent({ ...button, tree: { ...button.tree, type: 'rect' } })),
    ).toEqual(['tree.type']);
  });
});
