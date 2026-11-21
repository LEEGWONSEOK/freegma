import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type RootPackageJson = {
  packageManager?: string;
  engines?: { node?: string };
};

const root = new URL('../', import.meta.url);
const readText = (path: string) => readFile(new URL(path, root), 'utf8');

describe('워크스페이스 설정 (T0-1)', () => {
  it('Node 24를 쓴다', async () => {
    expect((await readText('.node-version')).trim()).toBe('24');
    expect(process.versions.node.split('.')[0]).toBe('24');
  });

  it('pnpm 버전과 Node 범위를 package.json에 고정한다', async () => {
    const pkg = JSON.parse(await readText('package.json')) as RootPackageJson;
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    expect(pkg.engines?.node).toBe('>=24 <25');
  });
});
