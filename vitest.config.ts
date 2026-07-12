import { defineConfig } from 'vitest/config'

// 순수 로직 테스트만 다루므로 React/DOM 플러그인 없이 node 환경으로 실행한다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
