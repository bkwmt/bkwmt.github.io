import { defineConfig, defaultExclude } from 'vitest/config';

// vitest 預設會掃描全專案的 *.spec.ts，與 Playwright 的 e2e/*.spec.ts 衝突
// （e2e 測試需要瀏覽器 fixture，不能被 vitest 當單元測試執行），故排除。
export default defineConfig({
  test: {
    exclude: [...defaultExclude, 'e2e/**'],
  },
});
