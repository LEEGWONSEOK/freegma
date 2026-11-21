import { describe, expect, it } from 'vitest';
import { validateNode } from './index.ts';

// design.md §3 «사람이 읽을 수 있게: 노드 예시» 그대로
const designExample = {
  id: 'n_8k2m',
  type: 'frame',
  name: '정보 카드',
  layout: { dir: 'col', gap: '{spacing.4}', pad: '{spacing.6}' },
  fill: '{color.surface}',
  children: [
    {
      id: 'n_2pq1',
      type: 'instance',
      of: 'button',
      props: { label: '장바구니 담기', variant: 'primary' },
    },
  ],
};

/** 검증이 실패해야 하고, 그 경로들을 돌려준다 */
function failedPaths(input: unknown): string[] {
  const result = validateNode(input);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues.map((i) => i.path);
}

describe('노드 스키마 — 통과해야 하는 것', () => {
  it('design.md §3 노드 예시', () => {
    const result = validateNode(designExample);
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === 'frame') {
      expect(result.value.children?.[0]?.type).toBe('instance');
    }
  });

  it('다섯 가지 노드 타입과 스타일 값', () => {
    const screen = {
      id: 'n_root01',
      type: 'frame',
      name: '상품 상세',
      w: 1440,
      h: 960,
      fill: '#F4F5F7',
      clip: true,
      layout: { dir: 'row', gap: 32, pad: ['{spacing.6}', 48], align: 'start', wrap: false },
      children: [
        {
          id: 'n_img001',
          type: 'image',
          name: '상품 이미지',
          src: 'assets/img-7f3a.png',
          w: 'fill',
        },
        {
          id: 'n_card01',
          type: 'frame',
          name: '정보 카드',
          w: 480,
          radius: [16, 16, 0, 0],
          stroke: { color: '{color.border}', width: 1, sides: ['top'] },
          shadow: '{shadow.md}',
          children: [
            {
              id: 'n_txt001',
              type: 'text',
              name: '상품명',
              text: '북유럽 스탠드 조명',
              textStyle: '{style.heading}',
              weight: 700,
              lineHeight: 1.3,
            },
            {
              id: 'n_rect01',
              type: 'rect',
              name: '구분선',
              w: 'fill',
              h: 1,
              fill: '{color.border}',
            },
            {
              id: 'n_btn001',
              type: 'instance',
              name: '찜',
              of: 'button',
              props: { disabled: false },
            },
          ],
        },
      ],
    };
    expect(validateNode(screen).ok).toBe(true);
  });
});

describe('노드 스키마 — 틀리면 어느 경로가 틀렸는지 알려 준다', () => {
  it('모르는 노드 타입', () => {
    expect(failedPaths({ ...designExample, type: 'group' })).toEqual(['type']);
  });

  it('자식의 잘못된 컴포넌트 id → children[0].of', () => {
    const bad = JSON.parse(JSON.stringify(designExample)) as typeof designExample;
    bad.children[0] = { ...bad.children[0], of: 'Button!' } as (typeof bad.children)[0];
    expect(failedPaths(bad)).toEqual(['children[0].of']);
  });

  it('토큰 참조 꼴이 틀림 → layout.gap', () => {
    const bad = { ...designExample, layout: { dir: 'col', gap: '{Spacing.4' } };
    expect(failedPaths(bad)).toEqual(['layout.gap']);
  });

  it('단위가 붙은 문자열 길이는 거절', () => {
    expect(failedPaths({ ...designExample, layout: { dir: 'col', gap: '14px' } })).toEqual([
      'layout.gap',
    ]);
  });

  it('모르는 키(오타)는 거절 — fil', () => {
    expect(failedPaths({ ...designExample, fil: '{color.surface}' })).toEqual(['fil']);
    const result = validateNode({ ...designExample, fil: '{color.surface}' });
    expect(result.ok ? '' : result.issues[0]?.message).toBe('모르는 키 «fil»');
  });

  it('이름은 선택이지만 빈 문자열은 거절', () => {
    expect(failedPaths({ ...designExample, name: '' })).toEqual(['name']);
  });

  it('id 형식, 음수 크기, 굵기, 이미지 경로', () => {
    expect(failedPaths({ ...designExample, id: '8k2m' })).toEqual(['id']);
    expect(failedPaths({ ...designExample, w: -1 })).toEqual(['w']);
    expect(
      failedPaths({ id: 'n_txt001', type: 'text', name: 't', text: 'a', weight: 450 }),
    ).toEqual(['weight']);
    expect(failedPaths({ id: 'n_img001', type: 'image', name: 'i', src: '/etc/passwd' })).toEqual([
      'src',
    ]);
  });

  it('깊은 곳의 오류도 정확한 경로', () => {
    const deep = {
      id: 'n_a0001',
      type: 'frame',
      name: 'a',
      children: [
        {
          id: 'n_b0001',
          type: 'frame',
          name: 'b',
          children: [{ id: 'n_c0001', type: 'text', name: 'c', text: 'x', color: 'red' }],
        },
      ],
    };
    expect(failedPaths(deep)).toEqual(['children[0].children[0].color']);
  });
});
