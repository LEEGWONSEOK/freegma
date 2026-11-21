/// <reference types="node" />
// 테스트에서만 Node 타입을 쓴다(패키지 코드는 Node·브라우저 공통이라 types: [])
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  listTokens,
  type TokenGroup,
  validateComponent,
  validateProject,
  validateScreen,
  validateSpec,
  validateSystem,
  validateTokenFile,
} from '@freegma/schema';
import { describe, expect, it } from 'vitest';
import { type FileKind, serialize } from './index.ts';

// 골든 테스트 (spec §11): fixtures의 freegma/ 파일을 읽어 → 스키마 검증 → 다시 쓰면 바이트가 같다.

const FIXTURES = new URL('../../../fixtures/', import.meta.url).pathname;
const PROJECTS = ['web-basic', 'mobile-basic'] as const;

/** freegma/ 안 상대 경로 → 파일 종류 (design §3 파일 형식) */
function kindOf(rel: string): FileKind | null {
  if (rel === 'project.json') return 'project';
  if (rel === 'spec.json') return 'spec';
  if (rel === 'system/system.json') return 'system';
  if (/^system\/tokens\/[^/]+\.tokens\.json$/.test(rel)) return 'tokens';
  if (/^system\/components\/[^/]+\.fg\.json$/.test(rel)) return 'component';
  if (/^screens\/[^/]+\.fg\.json$/.test(rel)) return 'screen';
  return null;
}

const VALIDATE = {
  project: validateProject,
  spec: validateSpec,
  system: validateSystem,
  tokens: validateTokenFile,
  component: validateComponent,
  screen: validateScreen,
} as const;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** 골든 검사: 다시 쓴 결과가 원본 글자와 똑같은가 */
export function isGolden(kind: FileKind, text: string): boolean {
  return serialize(kind, JSON.parse(text)) === text;
}

for (const project of PROJECTS) {
  const root = join(FIXTURES, project, 'freegma');
  const files = listFiles(root)
    .map((abs) => ({ abs, rel: relative(root, abs) }))
    .filter((f) => !f.rel.startsWith('assets/'))
    .sort((a, b) => a.rel.localeCompare(b.rel));

  describe(`fixtures/${project}`, () => {
    it('모르는 파일이 없다', () => {
      expect(files.filter((f) => kindOf(f.rel) === null).map((f) => f.rel)).toEqual([]);
    });

    it.each(files.map((f) => [f.rel, f.abs] as const))(
      '%s — 스키마 통과, 다시 쓰면 바이트가 같다',
      (rel, abs) => {
        const kind = kindOf(rel) as FileKind;
        const text = readFileSync(abs, 'utf8');
        const result = VALIDATE[kind](JSON.parse(text));
        expect(result.ok ? [] : result.issues).toEqual([]);
        expect(serialize(kind, JSON.parse(text))).toBe(text);
      },
    );

    it('구성: 도메인 3, 화면 3, 시안 1, 기본 컴포넌트 4', () => {
      const screens = files
        .filter((f) => kindOf(f.rel) === 'screen')
        .map((f) => JSON.parse(readFileSync(f.abs, 'utf8')) as { role?: string; domain?: string });
      expect(screens.filter((s) => s.role === 'screen')).toHaveLength(3);
      expect(screens.filter((s) => s.role === 'draft')).toHaveLength(1);
      expect(new Set(screens.map((s) => s.domain).filter(Boolean)).size).toBe(3);
      const kinds = files
        .filter((f) => kindOf(f.rel) === 'component')
        .map((f) => (JSON.parse(readFileSync(f.abs, 'utf8')) as { kind: string }).kind);
      expect(kinds.filter((k) => k === 'base')).toHaveLength(4);
    });

    it('서로 맞는다: 쓰는 토큰·컴포넌트·시안 원본·이미지가 모두 있다', () => {
      const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
      const tokens = new Set<string>();
      for (const f of files.filter((x) => kindOf(x.rel) === 'tokens')) {
        for (const name of listTokens(JSON.parse(read(f.rel)) as TokenGroup).keys())
          tokens.add(name);
      }
      const components = new Set(
        files
          .filter((f) => kindOf(f.rel) === 'component')
          .map((f) => (JSON.parse(read(f.rel)) as { id: string }).id),
      );
      const screenIds = new Set(
        files
          .filter((f) => kindOf(f.rel) === 'screen')
          .map((f) => (JSON.parse(read(f.rel)) as { id: string }).id),
      );
      const missing: string[] = [];
      for (const f of files) {
        const text = read(f.rel);
        for (const [, ref] of text.matchAll(/"\{([a-z0-9.-]+)\}"/g)) {
          if (!tokens.has(ref as string)) missing.push(`${f.rel}: 토큰 {${ref}}`);
        }
        for (const [, of] of text.matchAll(/"of": "([a-z0-9-]+)"/g)) {
          if (!components.has(of as string)) missing.push(`${f.rel}: 컴포넌트 ${of}`);
        }
        for (const [, id] of text.matchAll(/"draftOf": "([^"]+)"/g)) {
          if (!screenIds.has(id as string)) missing.push(`${f.rel}: 시안 원본 ${id}`);
        }
        for (const [, src] of text.matchAll(/"src": "(assets\/[^"]+)"/g)) {
          if (!listFiles(join(root, 'assets')).some((a) => relative(root, a) === src)) {
            missing.push(`${f.rel}: 이미지 ${src}`);
          }
        }
      }
      expect(missing).toEqual([]);
    });
  });
}

describe('골든 검사가 한 바이트 변화도 잡는다', () => {
  const text = readFileSync(join(FIXTURES, 'web-basic/freegma/screens/home.fg.json'), 'utf8');

  it('원본은 통과', () => expect(isGolden('screen', text)).toBe(true));
  it('공백 한 칸 추가', () =>
    expect(isGolden('screen', text.replace('"id": ', '"id":  '))).toBe(false));
  it('끝 줄바꿈 하나 더', () => expect(isGolden('screen', `${text}\n`)).toBe(false));
  it('키 순서 바꿈', () => {
    const swapped = text.replace(
      '"type": "frame",\n  "name": "홈"',
      '"name": "홈",\n  "type": "frame"',
    );
    expect(swapped).not.toBe(text);
    expect(isGolden('screen', swapped)).toBe(false);
  });
  it('숫자 표기 바꿈 (1440 → 1440.0)', () => {
    expect(isGolden('screen', text.replace('"w": 1440,', '"w": 1440.0,'))).toBe(false);
  });
});
