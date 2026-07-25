# bkwmt.github.io — 文獻筆記站

文獻精讀筆記的發布站。第一輯：Nick Crossley 的音樂社會網絡研究。

## 資料源

`~/Developer/research_library/Nick Crossley/notes/*.md` 是唯一權威資料源。
`src/content/notes/` 是 `npm run sync` 的產物（需 commit，CI build 用）。

## 新導讀上線流程

1. 在 research_library 寫完導讀（關鍵句區塊標題建議統一用 `### 關鍵句`）
2. 在 `scripts/sync-notes.sh` 加一行 `sync_one`；若導讀之間有互相引用連結，也要在 `astro.config.mjs` 的 `NOTE_ROUTES` 補上對應的站內路由映射
3. `npm run sync && npm test && npm run build`
4. 視需要補 `src/data/themes.yaml`、`src/data/concepts.yaml`
5. commit → push `main` → GitHub Actions 自動部署

## 指令

- `npm run dev` 本機預覽
- `npm run sync` 同步導讀
- `npm test` 解析器單元測試
- `npm run test:e2e` Playwright 煙霧測試
