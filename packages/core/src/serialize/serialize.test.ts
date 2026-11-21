import { describe, expect, it } from 'vitest';
import { round2 } from './number.ts';
import { serialize } from './stringify.ts';

// 결정적 섞기 — 테스트가 매번 같게 (간단한 LCG)
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** 객체 키 순서를 깊게 섞는다. 맵(props 등 사용자 이름)은 그대로 둔다 */
function shuffleKeys(
  value: unknown,
  rand: () => number,
  keep: readonly string[] = ['props'],
): unknown {
  if (Array.isArray(value)) return value.map((v) => shuffleKeys(v, rand, keep));
  if (typeof value !== 'object' || value === null) return value;
  const entries = Object.entries(value);
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [entries[i], entries[j]] = [entries[j] as [string, unknown], entries[i] as [string, unknown]];
  }
  return Object.fromEntries(
    entries.map(([k, v]) => [k, keep.includes(k) ? v : shuffleKeys(v, rand, keep)]),
  );
}

const screen = {
  id: 'n_7k2p',
  type: 'frame',
  name: '쿠폰함',
  role: 'screen',
  route: '/coupons',
  domain: '주문',
  code: { file: 'src/pages/CouponsPage.tsx' },
  w: 1440,
  h: 1024,
  fill: '{color.bg}',
  layout: { dir: 'col', gap: '{spacing.4}', pad: ['{spacing.6}', 48] },
  children: [
    {
      id: 'n_nav01',
      type: 'instance',
      name: '내비게이션',
      of: 'nav-bar',
      props: { title: '쿠폰함', back: true },
      w: 'fill',
    },
    {
      id: 'n_txt01',
      type: 'text',
      name: '제목',
      text: '쿠폰함',
      textStyle: '{style.heading}',
      weight: 700,
      lineHeight: 1.333333,
    },
  ],
};

describe('키 순서', () => {
  it('키 순서를 섞어 넣어도 출력 바이트가 같다 (20번)', () => {
    const expected = serialize('screen', screen);
    const rand = seeded(42);
    for (let i = 0; i < 20; i++) {
      expect(serialize('screen', shuffleKeys(screen, rand))).toBe(expected);
    }
  });

  it('읽기 좋은 순서: id, type, name, 화면 칸, … 스타일, children', () => {
    const keys = Object.keys(JSON.parse(serialize('screen', shuffleKeys(screen, seeded(7)))));
    expect(keys).toEqual([
      'id',
      'type',
      'name',
      'role',
      'route',
      'domain',
      'code',
      'w',
      'h',
      'layout',
      'fill',
      'children',
    ]);
  });

  it('맵(props, 토큰 이름)은 넣은 순서를 지킨다', () => {
    const out = JSON.parse(serialize('screen', screen));
    expect(Object.keys(out.children[0].props)).toEqual(['title', 'back']);
    const tokens = {
      color: {
        primary: { $value: '{brand.600}', $type: 'color' },
        bg: { $type: 'color', $value: '#FFFFFF' },
      },
    };
    const t = serialize('tokens', tokens);
    expect(Object.keys(JSON.parse(t).color)).toEqual(['primary', 'bg']);
    expect(Object.keys(JSON.parse(t).color.primary)).toEqual(['$type', '$value']);
  });

  it('컴포넌트 파일도 섞어도 같다', () => {
    const button = {
      id: 'button',
      name: 'Button',
      kind: 'base',
      props: {
        label: { type: 'text', required: true },
        variant: { type: 'enum', options: ['primary', 'ghost'], default: 'primary' },
      },
      usage: { use: '행동 하나', limits: { perScreen: { 'variant=primary': 1 } } },
      code: { import: '@/components/ui/button', name: 'Button', props: { children: '$label' } },
      tree: { id: 'n_b001', type: 'frame', name: 'Button', fill: '{color.primary}' },
    };
    const expected = serialize('component', button);
    expect(serialize('component', shuffleKeys(button, seeded(3), ['props', 'perScreen']))).toBe(
      expected,
    );
    // props 안의 정의 칸(type, options, default)은 모양대로 정렬된다
    expect(Object.keys(JSON.parse(expected).props.variant)).toEqual(['type', 'options', 'default']);
  });
});

describe('숫자', () => {
  it('경계값', () => {
    expect(round2(-0)).toBe(0);
    expect(Object.is(round2(-0), 0)).toBe(true);
    expect(Object.is(round2(-0.001), 0)).toBe(true);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(1.333333)).toBe(1.33);
    expect(round2(0.000001)).toBe(0);
    expect(round2(1e-7)).toBe(0);
    expect(round2(123456789.987)).toBe(123456789.99);
    expect(round2(16)).toBe(16);
  });

  it('유한하지 않은 수는 거절', () => {
    expect(() => round2(Number.NaN)).toThrow(RangeError);
    expect(() => serialize('screen', { ...screen, w: Number.POSITIVE_INFINITY })).toThrow(
      RangeError,
    );
  });

  it('출력에서 -0, 1.005가 정리된다', () => {
    const out = serialize('screen', { ...screen, x: -0, y: 1.005 });
    expect(out).toContain('"x": 0,');
    expect(out).toContain('"y": 1.01,');
  });
});

describe('기본값·빈 값 생략', () => {
  it('hidden·locked·clip false, opacity 1, w/h hug, stroke 두께 1, wrap false', () => {
    const node = {
      id: 'n_a0001',
      type: 'frame',
      name: 'a',
      hidden: false,
      locked: false,
      clip: false,
      opacity: 1,
      w: 'hug',
      h: 'hug',
      stroke: { color: '{color.border}', width: 1 },
      layout: { dir: 'row', wrap: false },
      children: [],
      fill: undefined,
    };
    expect(JSON.parse(serialize('screen', node))).toEqual({
      id: 'n_a0001',
      type: 'frame',
      name: 'a',
      layout: { dir: 'row' },
      stroke: { color: '{color.border}' },
    });
  });

  it('기본값이 아니면 남긴다', () => {
    const out = JSON.parse(
      serialize('screen', { id: 'n_a0001', type: 'frame', hidden: true, opacity: 0.5, w: 'fill' }),
    );
    expect(out).toEqual({ id: 'n_a0001', type: 'frame', w: 'fill', hidden: true, opacity: 0.5 });
  });
});

describe('형식', () => {
  it('2칸 들여쓰기, 끝 줄바꿈 1개, 글자·숫자 배열은 한 줄', () => {
    const out = serialize('screen', screen);
    expect(out.endsWith('}\n')).toBe(true);
    expect(out.endsWith('\n\n')).toBe(false);
    expect(out).toContain('\n  "id": "n_7k2p",');
    expect(out).toContain('"pad": ["{spacing.6}", 48]');
    expect(out).toContain('"name": "쿠폰함"'); // 한글은 그대로
  });

  it('다시 읽어 다시 써도 같다', () => {
    const once = serialize('screen', screen);
    expect(serialize('screen', JSON.parse(once))).toBe(once);
  });

  it('설계 문서 예시 모양 그대로', () => {
    expect(serialize('project', { platform: 'web', name: 'my-shop', formatVersion: 1 })).toBe(
      '{\n  "formatVersion": 1,\n  "name": "my-shop",\n  "platform": "web"\n}\n',
    );
  });
});
