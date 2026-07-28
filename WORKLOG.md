# WORKLOG — 文獻筆記站（bkwmt.github.io）

專案定位：把 `research_library/Nick Crossley/notes/` 的精讀導讀發布成公開網站，站上一切內容逐字取自導讀（最高原則），供使用者在外閱讀、交叉比對與註記。架構與流程詳見 [README.md](README.md)、設計文件 [docs/superpowers/specs/](docs/superpowers/specs/2026-07-25-reading-notes-site-design.md)。

## 2026-07-28 個人學術頁上線，同日升為站點首頁

**成果**：https://bkwmt.github.io/ （站點根）＝程明的簡式學術個人頁（著作目錄＋學歷，預設英文、中英切換，亮暗跟隨系統）。初版部署在 /cv/，數小時後依使用者指示改為首頁並移除 /cv/。

**變動**：刪除 `src/pages/index.astro`（原薄目錄首頁；筆記站入口本來就在 `/crossley/`，功能無損）；`Base.astro` 站名「文獻筆記」連結由 `/` 改 `/crossley/`；個人頁暫不連回筆記站（使用者指示）。

**權責**：此頁**不屬於筆記站管線**。唯一資料源是 `about_me/data/cv.yaml`，由 `about_me/site/build_site.py --deploy` 產出並複製到本 repo `public/`（index.html＋中英 CV PDF）；Astro 對 `public/` 原樣發布，`npm run sync` 與筆記站流程完全不碰它。要更新此頁：改 cv.yaml → 在 about_me 跑 build → 回本 repo commit＋push。

## 2026-07-25 第一版上線

**成果**：https://bkwmt.github.io 上線。首頁＋Crossley 第一輯（三份導讀全文、63 項概念索引、3 主題跨文本對照、14 則引文庫、localStorage 註記與 Markdown 匯出）。單元測試 40/40、Playwright 煙霧測試 3/3。

**流程**：brainstorm（釐清定位、互動功能、技術路線、註記後端）→ 設計文件 → 13 任務實作計畫 → subagent-driven 執行（每任務一個 implementer＋獨立審查、修正後複審）→ 最終全分支審查 → merge 部署。

**關鍵決策**：

- 技術路線選 Astro 5（使用者選定）；scaffolder 裝到 Astro 7 被審查攔下，釘回 5.x。
- `notes/*.md` 永遠是唯一權威：`scripts/sync-notes.sh` 複製＋注入 frontmatter，sync 產物 byte-verbatim（經程式化驗證）。導讀互相引用的連結不改寫來源，改在渲染層用 remark plugin 轉成站內路由（`astro.config.mjs` 的 `NOTE_ROUTES`）。
- 機械解析（關鍵句、概念清單靠標題慣例）與人工編纂（`themes.yaml` 摘錄、`concepts.yaml` 分類）分離；編纂檔逐字摘錄經 grep 抽查驗證。
- 標題錨點共用 `src/lib/heading-anchors.ts`：全文件 slug 對映重現 Astro 去重行為，重複標題視為歧義、警告不猜。
- 註記錨定採 text quote anchoring（exact＋前後 30 字），選取位移用 prefix-Range 法（涵蓋三連點等元素節點起點）。

**審查揪出並修掉的實質問題**：概念解析器拆錯複合詞條（44/46/56/62 四項）；引文解析器缺 `page:""` 契約；註記選取重複片語錨定錯位（兩輪修正）；刪除最後一則註記高亮殘留；面板 innerHTML 未轉義；主題對照桌機並排被無效 scoped CSS 廢掉；`**粗體**` 字面星號；favicon 未入版控（CI 會 404）；懸空 CLAUDE.md symlink。

**未完項（ship-and-track，下次維護順手做）**：

- deploy workflow 加 `npm test` 步驟
- 概念卡「出處」連到 Ch2 該節（現連頁頂）；概念搜尋可加 definition 文字
- 註記匯出補 pageTitle（現用 slug）；多段落選取的錨定正規化
- `renderExcerpt` 補單元測試（奇數 `**` 跨段落邊界案例）
- remark plugin 不處理 reference-style 連結（現語料為零）
- 待使用者手機實測：選取→註記→匯出流程

**下一步**：SNMW Ch11 導讀寫完後照 README「新導讀上線流程」加站（sync_one＋NOTE_ROUTES＋視需要補兩個 yaml）。
