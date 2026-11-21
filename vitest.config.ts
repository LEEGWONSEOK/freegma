import { defineConfig } from 'vitest/config';

// 워크스페이스 전체 테스트 설정 (spec §11)
// - tests/: 저장소 전체에 대한 검사(설정 파일 등)
// - packages/*, apps/*: 각 패키지가 자기 vitest 설정(또는 기본값)으로 실행
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'workspace',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
        },
      },
      'packages/*',
      'apps/*',
    ],
  },
});
