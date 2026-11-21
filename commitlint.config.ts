import type { Plugin, UserConfig } from '@commitlint/types';

// 커밋 메시지 규칙 — docs/git-convention.md §2 (nohack.tistory.com/17 컨벤션)
// <type>(<scope>): <subject>  /  body: 무엇을·왜, 줄 72자  /  footer: Ref: T1-3, Fixes: #12

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'design',
  'test',
  'refactor',
  'build',
  'ci',
  'perf',
  'chore',
  'rename',
  'remove',
];

// AI 서명 줄 금지 (git-convention §2-7)
const AI_ATTRIBUTION = [
  /^co-authored-by:.*(claude|anthropic|copilot|chatgpt|openai|gemini|cursor)/im,
  /generated with \[?claude code/i,
  /🤖 generated with/i,
];

const noAiAttribution: Plugin = {
  rules: {
    'no-ai-attribution': (parsed) => {
      const raw = parsed.raw ?? '';
      const hit = AI_ATTRIBUTION.find((re) => re.test(raw));
      return [
        !hit,
        'AI 서명 줄(Co-Authored-By: Claude 등)을 넣지 않는다 — docs/git-convention.md §2-7',
      ];
    },
  },
};

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  plugins: [noAiAttribution],
  rules: {
    'type-enum': [2, 'always', TYPES],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    // 영어면 첫 글자 대문자, 한국어도 허용 → 대소문자 규칙은 검사하지 않는다
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 50],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 72],
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 72],
    'no-ai-attribution': [2, 'always'],
  },
};

export { config as default };
