import { describe, expect, it } from 'vitest';
import { validateProject, validateScreen, validateSpec } from './index.ts';
import { expectOk, pathsOf } from './test-util.ts';

describe('project.json', () => {
  const project = {
    formatVersion: 1,
    name: 'my-shop',
    platform: 'web',
    domains: ['홈', '상품', '주문'],
    startScreen: 'n_home01',
  };

  it('맞는 예', () => expectOk(validateProject(project)));

  it('틀린 예', () => {
    expect(pathsOf(validateProject({ ...project, platform: 'desktop' }))).toEqual(['platform']);
    expect(pathsOf(validateProject({ ...project, formatVersion: 0 }))).toEqual(['formatVersion']);
    expect(pathsOf(validateProject({ name: 'x', platform: 'web' }))).toEqual(['formatVersion']);
    expect(pathsOf(validateProject({ ...project, domains: [''] }))).toEqual(['domains[0]']);
  });
});

describe('화면 파일 (screens/*.fg.json)', () => {
  // design.md §3 «화면 프레임» 예시 (children은 비움)
  const screen = {
    id: 'n_7k2p',
    type: 'frame',
    name: '쿠폰함',
    role: 'screen',
    route: '/coupons',
    domain: '주문',
    code: { file: 'src/pages/CouponsPage.tsx' },
    layout: { dir: 'col' },
    children: [],
  };

  it('design.md §3 화면 프레임 예시', () => expectOk(validateScreen(screen)));

  it('동적 라우트, 시안, 작업용 프레임', () => {
    expectOk(validateScreen({ ...screen, route: '/products/:id' }));
    expectOk(validateScreen({ ...screen, route: '/products/[id]' }));
    expectOk(validateScreen({ ...screen, route: '/' }));
    expectOk(
      validateScreen({
        id: 'n_7k2pb',
        type: 'frame',
        name: '쿠폰함 시안 B',
        role: 'draft',
        draftOf: 'n_7k2p',
      }),
    );
    expectOk(validateScreen({ id: 'n_work1', type: 'frame', name: '아이콘 모음' }));
  });

  it('화면은 route가 필요하고, 시안은 draftOf가 필요하다', () => {
    const { route: _r, ...noRoute } = screen;
    expect(pathsOf(validateScreen(noRoute))).toEqual(['route']);
    expect(pathsOf(validateScreen({ ...screen, role: 'draft' }))).toEqual([
      'draftOf',
      'route',
      'code',
    ]);
    expect(pathsOf(validateScreen({ id: 'n_work1', type: 'frame', route: '/x' }))).toEqual([
      'route',
    ]);
  });

  it('라우트·코드 경로 꼴', () => {
    expect(pathsOf(validateScreen({ ...screen, route: 'coupons' }))).toEqual(['route']);
    expect(pathsOf(validateScreen({ ...screen, route: '/쿠폰' }))).toEqual(['route']);
    expect(pathsOf(validateScreen({ ...screen, code: { file: '../outside.tsx' } }))).toEqual([
      'code.file',
    ]);
    expect(pathsOf(validateScreen({ ...screen, code: { file: '/abs.tsx' } }))).toEqual([
      'code.file',
    ]);
  });

  it('화면 칸이 아닌 오타는 여전히 거절', () => {
    expect(pathsOf(validateScreen({ ...screen, rout: '/x' }))).toEqual(['rout']);
  });
});

describe('spec.json', () => {
  // design.md §7 예시 + 라우터
  const spec = {
    platform: 'web',
    target: 'react',
    language: 'typescript',
    styling: 'tailwind@4',
    components: { library: 'shadcn', dir: 'src/components/ui' },
    tokens: { output: 'src/styles/tokens.css', format: 'css-vars' },
    router: { kind: 'react-router', file: 'src/router.tsx' },
    conventions: 'docs/frontend-conventions.md',
  };

  it('design.md §7 예시', () => expectOk(validateSpec(spec)));

  it('모바일 + Expo Router', () => {
    expectOk(
      validateSpec({ platform: 'mobile', target: 'react-native', router: { kind: 'expo-router' } }),
    );
  });

  it('플랫폼에 맞지 않는 target, 모르는 값', () => {
    expect(pathsOf(validateSpec({ ...spec, target: 'react-native' }))).toEqual(['target']);
    expect(pathsOf(validateSpec({ ...spec, tokens: { output: 'x.css', format: 'scss' } }))).toEqual(
      ['tokens.format'],
    );
    expect(pathsOf(validateSpec({ ...spec, router: { kind: 'remix' } }))).toEqual(['router.kind']);
  });
});
