# 文獻筆記站（bkwmt.github.io）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Crossley 精讀筆記發布成 Astro 靜態站（GitHub Pages），含導讀全文、概念索引、主題對照、引文庫與 localStorage 註記功能。

**Architecture:** `notes/*.md`（research_library）是唯一權威資料源，`sync-notes.sh` 複製進 `src/content/notes/` 並注入 frontmatter。引文與概念清單由純函數解析器在 build 時機械抽取；主題對照與概念分類由可審的 YAML 資料檔提供。互動全部 client-side vanilla JS，無後端。

**Tech Stack:** Astro 5（content collections + glob loader）、vitest（解析器單元測試）、Playwright（煙霧測試）、js-yaml、github-slugger、GitHub Actions（withastro/action）。

**Spec:** `docs/superpowers/specs/2026-07-25-reading-notes-site-design.md`

## Global Constraints

- **完全根據文本**：所有頁面內容逐字取自 `notes/*.md`；`themes.yaml`／`concepts.yaml` 只做選取與並排，不改寫、不添述；每則引文附原書頁碼。
- 權威資料源：`~/Developer/research_library/Nick Crossley/notes/*.md`。`src/content/notes/` 是 sync 產物，**必須 commit**（CI build 需要）。
- UI 文案一律繁體中文（臺灣用語）。
- 無外部 runtime 依賴、無追蹤、無 webfont：字型用系統堆疊 `"Noto Serif TC", "Songti TC", serif`（標題）與 `-apple-system, "PingFang TC", "Noto Sans TC", sans-serif`（內文）。
- Node 20+、Astro 5.x。js-yaml 必須是 v4（其 `load()` 預設安全 schema，不執行任意型別；禁用 v3 與自訂 Loader）。
- 全程在 `site-design` 分支工作（repo：`~/Developer/bkwmt.github.io`），最後一個 task 才 merge 進 `main` 觸發部署。
- 所有 commit 訊息結尾加 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

---

### Task 1: Astro 專案骨架＋Base layout＋首頁

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`
- Create: `src/layouts/Base.astro`, `src/styles/global.css`, `src/pages/index.astro`

**Interfaces:**
- Produces: `Base.astro`，props `{ title: string, description?: string }`，含 `<slot />`；全站 CSS variables（`--fg`, `--bg`, `--muted`, `--accent`, `--border`, `--highlight`）。

- [ ] **Step 1: 初始化 Astro 專案**

```bash
cd ~/Developer/bkwmt.github.io
npm create astro@latest . -- --template minimal --no-install --no-git --yes
npm install
npm install js-yaml github-slugger
npm install -D @types/js-yaml
```

（`--template minimal` 產生的 `src/pages/index.astro` 稍後覆寫。若 create 因目錄非空拒絕，先把 LICENSE、README.md、docs/ 暫移到 `/tmp` 再移回。）

- [ ] **Step 2: 設定 astro.config.mjs 與 .gitignore**

`astro.config.mjs`：

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://bkwmt.github.io',
});
```

`.gitignore` 確認含：

```gitignore
node_modules/
dist/
.astro/
```

- [ ] **Step 3: 寫 global.css**

`src/styles/global.css`：

```css
:root {
  --fg: #1c1b19;
  --bg: #faf8f4;
  --muted: #6b675f;
  --accent: #8b3a2f;
  --border: #ddd8cf;
  --highlight: rgba(212, 165, 116, 0.35);
  --serif: "Noto Serif TC", "Songti TC", "Times New Roman", serif;
  --sans: -apple-system, "PingFang TC", "Noto Sans TC", "Helvetica Neue", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fg: #e8e4dc;
    --bg: #191817;
    --muted: #9b968c;
    --accent: #d4907f;
    --border: #3a3733;
    --highlight: rgba(212, 165, 116, 0.25);
  }
}
* { box-sizing: border-box; }
html { color-scheme: light dark; }
body {
  margin: 0;
  font-family: var(--sans);
  color: var(--fg);
  background: var(--bg);
  line-height: 1.85;
}
h1, h2, h3, h4 { font-family: var(--serif); line-height: 1.4; }
a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
main { max-width: 38em; margin: 0 auto; padding: 2rem 1.25rem 5rem; }
.site-header {
  border-bottom: 1px solid var(--border);
  padding: 0.9rem 1.25rem;
  display: flex; gap: 1.25rem; align-items: baseline; flex-wrap: wrap;
  font-family: var(--serif);
}
.site-header .site-name { font-weight: 700; color: var(--fg); text-decoration: none; }
.site-header nav { display: flex; gap: 1rem; font-size: 0.9rem; }
.site-header nav a { color: var(--muted); text-decoration: none; }
.site-header nav a:hover, .site-header nav a[aria-current="page"] { color: var(--accent); }
.site-footer {
  border-top: 1px solid var(--border);
  color: var(--muted); font-size: 0.8rem;
  padding: 1.5rem 1.25rem; text-align: center;
}
.card {
  border: 1px solid var(--border); border-radius: 8px;
  padding: 1rem 1.25rem; margin: 1rem 0;
}
.chip {
  display: inline-block; border: 1px solid var(--border); border-radius: 999px;
  padding: 0.1rem 0.7rem; font-size: 0.82rem; color: var(--muted);
  background: none; cursor: pointer; font-family: var(--sans);
}
.chip[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
.muted { color: var(--muted); }
```

- [ ] **Step 4: 寫 Base.astro**

`src/layouts/Base.astro`：

```astro
---
import '../styles/global.css';
interface Props { title: string; description?: string; }
const { title, description = '文獻閱讀筆記' } = Astro.props;
const path = Astro.url.pathname;
const nav = [
  { href: '/crossley/', label: 'Crossley 精讀' },
  { href: '/crossley/concepts/', label: '概念索引' },
  { href: '/crossley/themes/', label: '主題對照' },
  { href: '/crossley/quotes/', label: '引文庫' },
];
---
<!doctype html>
<html lang="zh-Hant-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}｜文獻筆記</title>
  </head>
  <body>
    <header class="site-header">
      <a class="site-name" href="/">文獻筆記</a>
      <nav>
        {nav.map((n) => (
          <a href={n.href} aria-current={path === n.href ? 'page' : undefined}>{n.label}</a>
        ))}
      </nav>
    </header>
    <main><slot /></main>
    <footer class="site-footer">
      閱讀筆記，內容均出自導讀文本；引文著作權屬原作者。
    </footer>
  </body>
</html>
```

- [ ] **Step 5: 寫首頁**

`src/pages/index.astro`：

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="首頁">
  <h1>文獻筆記</h1>
  <p class="muted">各輯文獻的精讀導讀、概念索引與交叉比對。</p>
  <a class="card" href="/crossley/" style="display:block; text-decoration:none; color:inherit;">
    <h2 style="margin-top:0;">第一輯：Nick Crossley 的音樂社會網絡研究</h2>
    <p class="muted" style="margin-bottom:0;">
      三份導讀已完成：Pretty Connected（2008）、《Social Networks and Music Worlds》Ch1、Ch2。
      含概念索引、跨文本主題對照與關鍵句引文庫。
    </p>
  </a>
</Base>
```

- [ ] **Step 6: build 驗證＋commit**

```bash
npm run build
```

Expected: `astro build` 成功，`dist/index.html` 存在。

```bash
git add -A
git commit -m "feat: Astro 骨架、Base layout 與首頁"
```

---

### Task 2: sync-notes.sh＋content collection＋導讀全文頁

**Files:**
- Create: `scripts/sync-notes.sh`
- Create: `src/content.config.ts`
- Create: `src/pages/crossley/notes/[slug].astro`
- Create: `src/components/Toc.astro`
- Modify: `src/styles/global.css`（附加文章樣式）
- Modify: `package.json`（加 `sync` script）

**Interfaces:**
- Consumes: Task 1 的 `Base.astro`。
- Produces: content collection `notes`，schema `{ title: string, source: string, year: number, order: number }`，entry id 即 slug（`2008-pretty-connected`, `2015-snmw-ch1`, `2015-snmw-ch2`）；頁面路由 `/crossley/notes/<slug>/`。後續任務以 `getCollection('notes')` 取得 `entry.body`（raw markdown）。

- [ ] **Step 1: 寫 sync-notes.sh**

`scripts/sync-notes.sh`：

```bash
#!/usr/bin/env bash
# 從 research_library 同步導讀（唯一權威資料源）到 src/content/notes/ 並注入 frontmatter。
set -euo pipefail

SRC="$HOME/Developer/research_library/Nick Crossley/notes"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/content/notes"
mkdir -p "$DEST"

sync_one() {
  local file="$1" slug="$2" title="$3" source="$4" year="$5" order="$6"
  if [[ ! -f "$SRC/$file" ]]; then
    echo "WARN: 找不到 $SRC/$file，跳過" >&2
    return 0
  fi
  {
    printf -- '---\n'
    printf 'title: "%s"\n' "$title"
    printf 'source: "%s"\n' "$source"
    printf 'year: %s\n' "$year"
    printf 'order: %s\n' "$order"
    printf -- '---\n\n'
    cat "$SRC/$file"
  } > "$DEST/$slug.md"
  echo "synced: $file -> $slug.md"
}

sync_one "2008_Crossley_Pretty-Connected_導讀.md" "2008-pretty-connected" \
  "Pretty Connected：早期英國 punk 的社會網絡" \
  "Crossley (2008), Theory, Culture & Society 25(6): 89–116" 2008 1
sync_one "2015_SNMW-Ch1_Introduction_導讀.md" "2015-snmw-ch1" \
  "SNMW Ch1：Introduction" \
  "Crossley, McAndrew & Widdop (eds.) (2015), Social Networks and Music Worlds, Ch. 1" 2015 2
sync_one "2015_SNMW-Ch2_What-is-SNA_導讀.md" "2015-snmw-ch2" \
  "SNMW Ch2：什麼是社會網絡分析" \
  "Crossley, McAndrew & Widdop (eds.) (2015), Social Networks and Music Worlds, Ch. 2" 2015 3
```

（`notes/README.md` 是索引檔，刻意不 sync。新導讀＝在此加一行 `sync_one`。）

- [ ] **Step 2: 跑 sync＋加 npm script**

```bash
chmod +x scripts/sync-notes.sh && ./scripts/sync-notes.sh
```

Expected: 三行 `synced:`，`src/content/notes/` 出現三個 .md。

`package.json` 的 `scripts` 加：`"sync": "bash scripts/sync-notes.sh"`。

- [ ] **Step 3: 寫 content.config.ts**

`src/content.config.ts`：

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    source: z.string(),
    year: z.number(),
    order: z.number(),
  }),
});

export const collections = { notes };
```

- [ ] **Step 4: 寫 Toc.astro（目次＋scroll-spy）**

`src/components/Toc.astro`：

```astro
---
interface Props { headings: { depth: number; slug: string; text: string }[]; }
const { headings } = Astro.props;
const items = headings.filter((h) => h.depth === 2 || h.depth === 3);
---
<button id="toc-toggle" aria-expanded="false" aria-controls="toc">目次</button>
<nav id="toc" aria-label="目次">
  <ul>
    {items.map((h) => (
      <li class={`toc-d${h.depth}`}><a href={`#${h.slug}`}>{h.text}</a></li>
    ))}
  </ul>
</nav>
<script>
  const toc = document.getElementById('toc')!;
  const toggle = document.getElementById('toc-toggle')!;
  toggle.addEventListener('click', () => {
    const open = toc.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  toc.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName === 'A') {
      toc.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  const links = new Map(
    [...toc.querySelectorAll('a')].map((a) => [decodeURIComponent(a.hash.slice(1)), a]),
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          links.forEach((a) => a.classList.remove('active'));
          links.get(entry.target.id)?.classList.add('active');
        }
      }
    },
    { rootMargin: '0px 0px -75% 0px' },
  );
  links.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
</script>
```

- [ ] **Step 5: 寫導讀全文頁**

`src/pages/crossley/notes/[slug].astro`：

```astro
---
import { getCollection, render } from 'astro:content';
import Base from '../../../layouts/Base.astro';
import Toc from '../../../components/Toc.astro';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map((note) => ({ params: { slug: note.id }, props: { note } }));
}
const { note } = Astro.props;
const { Content, headings } = await render(note);
---
<Base title={note.data.title}>
  <p class="muted note-source">{note.data.source}</p>
  <Toc headings={headings} />
  <article class="note-body" data-note={note.id} data-note-title={note.data.title}>
    <Content />
  </article>
</Base>
```

- [ ] **Step 6: global.css 附加文章與目次樣式**

附加到 `src/styles/global.css`：

```css
/* 導讀全文 */
.note-source { margin-top: 0; font-size: 0.9rem; }
.note-body blockquote {
  border-left: 3px solid var(--border); margin: 1rem 0; padding: 0.1rem 1rem;
  color: var(--muted);
}
.note-body table { border-collapse: collapse; display: block; overflow-x: auto; }
.note-body th, .note-body td { border: 1px solid var(--border); padding: 0.35rem 0.6rem; }
.note-body code { background: var(--highlight); padding: 0.1em 0.3em; border-radius: 3px; }
mark[data-annotation] { background: var(--highlight); color: inherit; }

/* 目次 */
#toc {
  position: fixed; right: max(1rem, calc(50% - 19em - 17rem)); top: 5rem;
  width: 15rem; max-height: 70vh; overflow-y: auto;
  font-size: 0.82rem; line-height: 1.6;
}
#toc ul { list-style: none; margin: 0; padding: 0; }
#toc .toc-d3 { padding-left: 1rem; }
#toc a { color: var(--muted); text-decoration: none; display: block; padding: 0.1rem 0; }
#toc a.active, #toc a:hover { color: var(--accent); }
#toc-toggle { display: none; }
@media (max-width: 74rem) {
  #toc {
    display: none; right: 1rem; bottom: 4.5rem; top: auto;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem;
  }
  #toc.open { display: block; z-index: 50; }
  #toc-toggle {
    display: block; position: fixed; right: 1rem; bottom: 1rem; z-index: 50;
    border: 1px solid var(--border); border-radius: 999px; background: var(--bg);
    color: var(--fg); padding: 0.5rem 1rem; font-family: var(--sans); cursor: pointer;
  }
}
```

- [ ] **Step 7: build 驗證＋commit**

```bash
npm run build && ls dist/crossley/notes/
```

Expected: build 成功；`dist/crossley/notes/` 下有 `2008-pretty-connected/`、`2015-snmw-ch1/`、`2015-snmw-ch2/` 三個目錄。

```bash
git add -A
git commit -m "feat: 導讀同步腳本、content collection 與全文頁（含目次 scroll-spy）"
```

---

### Task 3: vitest＋關鍵句解析器（TDD）

**Files:**
- Create: `src/lib/parse-quotes.ts`
- Create: `tests/parse-quotes.test.ts`
- Modify: `package.json`（加 vitest）

**Interfaces:**
- Produces:

```ts
export interface Quote {
  text: string;     // 引文本體（去掉外層「」；無「」者取冒號後全文）
  page: string;     // 例 "p. 2"、"p. 16"；抓不到頁碼時為 ""
  note?: string;    // 頁碼後的備註（「；」或尾括號內容）
  section: string;  // 引文所屬區塊的上層小節標題（無 # 前綴）
}
export function parseQuotes(md: string): Quote[];
```

解析規則：掃描 h2/h3 標題；**標題含「關鍵句」者**開啟引文區塊，收集到下一個同級或更高級標題為止。區塊內兩種項目格式都要認：
（A）Ch1 bullet：`- 「text」（p. 2）` 或 `- 「text」（p. 2；備註）`
（B）Ch2 numbered：`1. p. 16：「text」` 或 `4. p. 21：無引號描述（備註）。`
`section`：格式 A 取「關鍵句」標題的上一個 h2 標題；格式 B（區塊標題本身是 h2）取該標題。

- [ ] **Step 1: 安裝 vitest**

```bash
npm install -D vitest
```

`package.json` 的 `scripts` 加：`"test": "vitest run"`。

- [ ] **Step 2: 寫失敗測試**

`tests/parse-quotes.test.ts`（fixture 逐字取自導讀）：

```ts
import { describe, it, expect } from 'vitest';
import { parseQuotes } from '../src/lib/parse-quotes';

const CH1_STYLE = `
## 一、開場：從次文化的破產到 music worlds 的選擇（pp. 1–2，無小標題）

### （a）核心論點

內文略。

### 關鍵句（seminar 可引）

- 「It is not a prescriptive concept. It is a sensitising concept which invites open-minded empirical inquiry and comparison.」（p. 2）
- 「Music worlds have a reticular structure and this demands sociological investigation.」（p. 2；reticular＝網狀的）

## 二、Networks and worlds（p. 3，總起段）

內文略。
`;

const CH2_STYLE = `
## 五、seminar 關鍵句選

1. p. 16：「弄清楚連帶不存在於何處，與弄清楚它存在於何處同等重要。」
2. p. 21：Letts–Rotten 流感比喻（路徑＝擴散管道）。

## 六、對照 ghouse 的檢核（初步，供後續展開）
`;

describe('parseQuotes：Ch1 bullet 格式', () => {
  const quotes = parseQuotes(CH1_STYLE);

  it('抓到兩則引文，不多不少', () => {
    expect(quotes).toHaveLength(2);
  });
  it('引文本體去掉外層「」', () => {
    expect(quotes[0].text).toBe(
      'It is not a prescriptive concept. It is a sensitising concept which invites open-minded empirical inquiry and comparison.',
    );
  });
  it('抓到頁碼與備註', () => {
    expect(quotes[0].page).toBe('p. 2');
    expect(quotes[0].note).toBeUndefined();
    expect(quotes[1].page).toBe('p. 2');
    expect(quotes[1].note).toBe('reticular＝網狀的');
  });
  it('section 是上層 h2 小節標題', () => {
    expect(quotes[0].section).toBe('一、開場：從次文化的破產到 music worlds 的選擇（pp. 1–2，無小標題）');
  });
});

describe('parseQuotes：Ch2 numbered 格式', () => {
  const quotes = parseQuotes(CH2_STYLE);

  it('抓到兩則', () => {
    expect(quotes).toHaveLength(2);
  });
  it('頁碼在前的格式', () => {
    expect(quotes[0].page).toBe('p. 16');
    expect(quotes[0].text).toBe('弄清楚連帶不存在於何處，與弄清楚它存在於何處同等重要。');
  });
  it('無「」的項目取冒號後全文為 text', () => {
    expect(quotes[1].text).toBe('Letts–Rotten 流感比喻（路徑＝擴散管道）。');
    expect(quotes[1].page).toBe('p. 21');
  });
  it('section 是關鍵句區塊標題本身', () => {
    expect(quotes[0].section).toBe('五、seminar 關鍵句選');
  });
});

describe('parseQuotes：無關鍵句區塊', () => {
  it('回傳空陣列', () => {
    expect(parseQuotes('## 理論骨架一覽\n\n- 項目')).toEqual([]);
  });
});
```

- [ ] **Step 3: 跑測試確認失敗**

```bash
npm test
```

Expected: FAIL，`Cannot find module '../src/lib/parse-quotes'`。

- [ ] **Step 4: 實作 parse-quotes.ts**

`src/lib/parse-quotes.ts`：

```ts
export interface Quote {
  text: string;
  page: string;
  note?: string;
  section: string;
}

const HEADING_RE = /^(#{2,3})\s+(.+)$/;
// 格式 A：- 「text」（p. 2）或（p. 2；備註）
const BULLET_RE = /^[-*]\s+「(.+)」（(pp?\.\s*[\d–\-,\s]+)(?:；(.+?))?）\s*$/;
// 格式 B：1. p. 16：「text」（備註）？ 或 1. p. 21：無引號描述
const NUMBERED_RE = /^\d+\.\s+(pp?\.\s*[\d–\-,\s]+?)：(.+)$/;

function stripQuoteMarks(s: string): { text: string; note?: string } {
  const m = s.match(/^「(.+)」(?:（(.+)）)?\s*$/);
  if (m) return { text: m[1], note: m[2] || undefined };
  return { text: s.trim() };
}

export function parseQuotes(md: string): Quote[] {
  const quotes: Quote[] = [];
  let lastH2 = '';
  let inBlock = false;
  let blockDepth = 0;
  let section = '';

  for (const line of md.split('\n')) {
    const h = line.match(HEADING_RE);
    if (h) {
      const depth = h[1].length;
      const text = h[2].trim();
      if (inBlock && depth <= blockDepth) inBlock = false;
      if (text.includes('關鍵句')) {
        inBlock = true;
        blockDepth = depth;
        // h3 區塊隸屬上一個 h2；h2 區塊隸屬自身
        section = depth === 3 ? lastH2 : text;
      }
      if (depth === 2) lastH2 = text;
      continue;
    }
    if (!inBlock) continue;

    const a = line.match(BULLET_RE);
    if (a) {
      quotes.push({ text: a[1], page: a[2].trim(), note: a[3] || undefined, section });
      continue;
    }
    const b = line.match(NUMBERED_RE);
    if (b) {
      const { text, note } = stripQuoteMarks(b[2]);
      quotes.push({ text, page: b[1].trim(), note, section });
    }
  }
  return quotes;
}
```

- [ ] **Step 5: 跑測試確認通過**

```bash
npm test
```

Expected: PASS（9 tests）。

- [ ] **Step 6: 對真實導讀做冒煙檢查**

```bash
node -e "
import('./src/lib/parse-quotes.ts').catch(() => {});
" 2>/dev/null || npx vitest run --reporter=verbose
node --experimental-strip-types -e "
const fs = require('fs');
const { parseQuotes } = require('./src/lib/parse-quotes.ts');
for (const f of fs.readdirSync('src/content/notes')) {
  const md = fs.readFileSync('src/content/notes/' + f, 'utf8');
  console.log(f, parseQuotes(md).length);
}
"
```

Expected: `2015-snmw-ch1.md` 與 `2015-snmw-ch2.md` 數量 > 0；`2008-pretty-connected.md` 為 0（該篇無關鍵句區塊，spec 已知）。若 node 版本不支援 `--experimental-strip-types`，改在測試檔加一個讀真實檔案的測試跑一次後移除。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 關鍵句解析器（兩種格式）與單元測試"
```

---

### Task 4: 概念清單解析器（TDD）

**Files:**
- Create: `src/lib/parse-concepts.ts`
- Test: `tests/parse-concepts.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Concept {
  index: number;      // 清單序號
  term: string;       // 中文名，例 "節點"
  original?: string;  // 括號內原文，例 "node/vertex"；無括號則 undefined
  definition: string; // ——後的定義（逐字）
}
export function parseConcepts(md: string): Concept[];
```

解析規則：找標題含「概念清單」的 h2 區塊，收集到下一個 h2 為止；項目格式 `N. **term（original）**——definition`。

- [ ] **Step 1: 寫失敗測試**

`tests/parse-concepts.test.ts`（fixture 逐字取自 Ch2 導讀）：

```ts
import { describe, it, expect } from 'vitest';
import { parseConcepts } from '../src/lib/parse-concepts';

const FIXTURE = `
## 二、全章技術概念清單（63 項，依出現順序）

1. **musicking**——音樂作為集體行動的總稱（Small）。
2. **節點（node/vertex）**——被連結（或未被連結）的對象；任何事物只要界定得有意義都可作節點。
9. **正／負向連帶（positive/negative ties）**——霸凌、互嗆亦可分析。

## 三、圖表描述

1. **不是概念**——不應被抓到。
`;

describe('parseConcepts', () => {
  const concepts = parseConcepts(FIXTURE);

  it('只抓概念清單區塊內的項目', () => {
    expect(concepts).toHaveLength(3);
  });
  it('無原文括號的概念', () => {
    expect(concepts[0]).toEqual({
      index: 1,
      term: 'musicking',
      original: undefined,
      definition: '音樂作為集體行動的總稱（Small）。',
    });
  });
  it('有原文括號的概念（全形括號）', () => {
    expect(concepts[1].term).toBe('節點');
    expect(concepts[1].original).toBe('node/vertex');
    expect(concepts[1].definition).toBe('被連結（或未被連結）的對象；任何事物只要界定得有意義都可作節點。');
  });
  it('term 內含全形斜線', () => {
    expect(concepts[2].term).toBe('正／負向連帶');
    expect(concepts[2].original).toBe('positive/negative ties');
  });
  it('無概念清單區塊回傳空陣列', () => {
    expect(parseConcepts('## 一、逐節萃取\n\n1. **x**——y')).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
npm test
```

Expected: FAIL，`Cannot find module '../src/lib/parse-concepts'`。

- [ ] **Step 3: 實作 parse-concepts.ts**

`src/lib/parse-concepts.ts`：

```ts
export interface Concept {
  index: number;
  term: string;
  original?: string;
  definition: string;
}

const H2_RE = /^##\s+(.+)$/;
const ITEM_RE = /^(\d+)\.\s+\*\*(.+?)\*\*——(.+)$/;
const TERM_RE = /^(.+?)（([^）]+)）$/;

export function parseConcepts(md: string): Concept[] {
  const concepts: Concept[] = [];
  let inBlock = false;

  for (const line of md.split('\n')) {
    const h = line.match(H2_RE);
    if (h) {
      inBlock = h[1].includes('概念清單');
      continue;
    }
    if (!inBlock) continue;
    const m = line.match(ITEM_RE);
    if (!m) continue;
    const termRaw = m[2].trim();
    const t = termRaw.match(TERM_RE);
    concepts.push({
      index: Number(m[1]),
      term: t ? t[1] : termRaw,
      original: t ? t[2] : undefined,
      definition: m[3].trim(),
    });
  }
  return concepts;
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
npm test
```

Expected: PASS（parse-quotes 9 + parse-concepts 5 = 14 tests）。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 概念清單解析器與單元測試"
```

---

### Task 5: 引文庫頁 `/crossley/quotes/`

**Files:**
- Create: `src/pages/crossley/quotes.astro`
- Modify: `src/styles/global.css`（附加引文卡片樣式）

**Interfaces:**
- Consumes: `parseQuotes(entry.body)`（Task 3）、content collection `notes`（Task 2）。

- [ ] **Step 1: 寫頁面**

`src/pages/crossley/quotes.astro`：

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { parseQuotes } from '../../lib/parse-quotes';

const notes = (await getCollection('notes')).sort((a, b) => a.data.order - b.data.order);
const groups = notes
  .map((n) => ({
    id: n.id,
    title: n.data.title,
    source: n.data.source,
    quotes: parseQuotes(n.body ?? ''),
  }))
  .filter((g) => g.quotes.length > 0);
const missing = notes.filter((n) => parseQuotes(n.body ?? '').length === 0);
---
<Base title="關鍵句引文庫">
  <h1>關鍵句引文庫</h1>
  <p class="muted">
    引文逐字取自各導讀的關鍵句區塊，附原書頁碼。
    {missing.length > 0 && `（${missing.map((n) => n.data.title).join('、')} 無關鍵句區塊，未收錄。）`}
  </p>
  <div class="chips" role="group" aria-label="依文本篩選">
    <button class="chip" data-filter="all" aria-pressed="true">全部</button>
    {groups.map((g) => (
      <button class="chip" data-filter={g.id} aria-pressed="false">{g.data?.title ?? g.title}</button>
    ))}
  </div>
  {groups.map((g) => (
    <section data-group={g.id}>
      <h2>{g.title}</h2>
      {g.quotes.map((q) => (
        <figure class="quote-card" data-group={g.id}>
          <blockquote>{q.text}</blockquote>
          <figcaption class="muted">
            {q.page}｜{q.section}{q.note && `｜${q.note}`}
          </figcaption>
          <button
            class="copy-btn"
            data-copy={`「${q.text}」（${g.source}, ${q.page}）`}
          >複製引文</button>
        </figure>
      ))}
    </section>
  ))}
</Base>

<script>
  document.querySelectorAll<HTMLButtonElement>('.chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      const f = chip.dataset.filter!;
      document.querySelectorAll<HTMLElement>('section[data-group]').forEach((s) => {
        s.hidden = f !== 'all' && s.dataset.group !== f;
      });
    });
  });
  document.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.copy!);
      const old = btn.textContent;
      btn.textContent = '已複製';
      setTimeout(() => (btn.textContent = old), 1200);
    });
  });
</script>
```

- [ ] **Step 2: global.css 附加樣式**

```css
/* 引文卡片 */
.chips { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1rem 0 1.5rem; }
.quote-card {
  border: 1px solid var(--border); border-radius: 8px;
  margin: 0 0 1rem; padding: 1rem 1.25rem;
}
.quote-card blockquote { margin: 0 0 0.5rem; font-family: var(--serif); }
.quote-card figcaption { font-size: 0.82rem; }
.copy-btn {
  margin-top: 0.5rem; border: 1px solid var(--border); border-radius: 6px;
  background: none; color: var(--muted); font-size: 0.8rem;
  padding: 0.2rem 0.7rem; cursor: pointer; font-family: var(--sans);
}
.copy-btn:hover { color: var(--accent); border-color: var(--accent); }
```

- [ ] **Step 3: build 驗證＋人工檢查**

```bash
npm run build && grep -c 'quote-card' dist/crossley/quotes/index.html
```

Expected: build 成功，數字 > 0（Ch1＋Ch2 的引文都渲染出來）。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: 關鍵句引文庫頁（篩選＋複製）"
```

---

### Task 6: concepts.yaml＋概念索引頁 `/crossley/concepts/`

**Files:**
- Create: `src/data/concepts.yaml`
- Create: `src/pages/crossley/concepts.astro`

**Interfaces:**
- Consumes: `parseConcepts`（Task 4）、collection `notes`。
- Produces: `src/data/concepts.yaml` schema：

```yaml
# 概念補充標註（人工編纂，可審）。
# category：純導航用分類；refs：概念在其他導讀出現的位置（初版可留空清單）。
categories:
  - 基本元素      # 節點、連帶、屬性等
  - 資料形態      # 整體網絡、ego-net、二模、矩陣格式
  - 節點層次測量  # 各種中心性
  - 網絡層次測量  # 密度、距離、聚類等
  - 子結構        # 派系、社群偵測、核心邊陲
  - 統計模型      # dyad/triad、同質性、ERGM、SIENA
  - 動態與其他
concepts:
  - index: 1
    category: 基本元素
    refs: []
  - index: 2
    category: 基本元素
    refs:
      - note: 2008-pretty-connected
        heading: "6. 建構網絡（p. 100）——操作化細節"
```

- [ ] **Step 1: 編纂 concepts.yaml**

規則（編纂行為，內容不改寫）：
1. 跑 `parseConcepts` 得 63 項清單（可用臨時 script 印出：`npx vitest` 環境外直接看 Ch2 導讀「## 二、全章技術概念清單」原文即可）。
2. 每項依其**定義文字的語意**分到上列七類之一；不確定就放「動態與其他」。分類只影響導航 chips，不出現任何新的解釋文字。
3. `refs` 初版只填有把握的交叉出現（例：中心性測量在 2008 篇「7. 分析網絡（pp. 100–107）——形式測量與機制翻譯」小節有機制翻譯），沒有把握就留 `[]`。heading 必須逐字複製導讀中的標題文字。

- [ ] **Step 2: 寫頁面**

`src/pages/crossley/concepts.astro`：

```astro
---
import fs from 'node:fs';
import yaml from 'js-yaml';
import GithubSlugger from 'github-slugger';
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { parseConcepts } from '../../lib/parse-concepts';

const ch2 = (await getCollection('notes')).find((n) => n.id === '2015-snmw-ch2');
if (!ch2) throw new Error('找不到 2015-snmw-ch2，請先跑 npm run sync');
const concepts = parseConcepts(ch2.body ?? '');

interface Meta { index: number; category: string; refs: { note: string; heading: string }[] }
const meta = yaml.load(fs.readFileSync('src/data/concepts.yaml', 'utf8')) as {
  categories: string[]; concepts: Meta[];
};
const metaByIndex = new Map(meta.concepts.map((m) => [m.index, m]));

// anchor 驗證：refs 指到的標題必須存在於該導讀，否則 build log 警告
const allNotes = await getCollection('notes');
const slugger = new GithubSlugger();
function refHref(ref: { note: string; heading: string }): string | null {
  const target = allNotes.find((n) => n.id === ref.note);
  if (!target || !(target.body ?? '').split('\n').some((l) => l.replace(/^#+\s*/, '').trim() === ref.heading)) {
    console.warn(`[concepts.yaml] 待對位：${ref.note} 無標題「${ref.heading}」`);
    return null;
  }
  slugger.reset();
  return `/crossley/notes/${ref.note}/#${slugger.slug(ref.heading)}`;
}
const items = concepts.map((c) => {
  const m = metaByIndex.get(c.index);
  return {
    ...c,
    category: m?.category ?? '動態與其他',
    refs: (m?.refs ?? []).map((r) => ({ ...r, href: refHref(r) })),
  };
});
const ch2TocHref = '/crossley/notes/2015-snmw-ch2/';
---
<Base title="概念索引">
  <h1>概念索引</h1>
  <p class="muted">Ch2 導讀的 63 項技術概念清單，定義逐字取自導讀；分類僅供導航。</p>
  <input id="concept-search" type="search" placeholder="搜尋概念（中文或原文）⋯" aria-label="搜尋概念" />
  <div class="chips" role="group" aria-label="依分類篩選">
    <button class="chip" data-cat="all" aria-pressed="true">全部</button>
    {meta.categories.map((cat) => (
      <button class="chip" data-cat={cat} aria-pressed="false">{cat}</button>
    ))}
  </div>
  <ol class="concept-list">
    {items.map((c) => (
      <li
        class="card concept"
        data-cat={c.category}
        data-search={`${c.term} ${c.original ?? ''}`.toLowerCase()}
        value={c.index}
      >
        <details>
          <summary>
            <strong>{c.term}</strong>
            {c.original && <span class="muted">（{c.original}）</span>}
            <span class="chip" style="pointer-events:none; margin-left:0.5rem;">{c.category}</span>
          </summary>
          <p>{c.definition}</p>
          <p class="muted" style="font-size:0.82rem;">
            出處：<a href={ch2TocHref}>Ch2 導讀・全章技術概念清單</a> 第 {c.index} 項
            {c.refs.map((r) =>
              r.href
                ? <>｜另見 <a href={r.href}>{r.note}</a></>
                : <>｜來源段落待對位（{r.note}）</>
            )}
          </p>
        </details>
      </li>
    ))}
  </ol>
  <p id="no-result" class="muted" hidden>沒有符合的概念。</p>
</Base>

<script>
  const search = document.getElementById('concept-search') as HTMLInputElement;
  const items = [...document.querySelectorAll<HTMLElement>('.concept')];
  const noResult = document.getElementById('no-result')!;
  let cat = 'all';

  function apply() {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    for (const el of items) {
      const okCat = cat === 'all' || el.dataset.cat === cat;
      const okQ = !q || el.dataset.search!.includes(q);
      el.hidden = !(okCat && okQ);
      if (!el.hidden) visible++;
    }
    noResult.hidden = visible > 0;
  }
  search.addEventListener('input', apply);
  document.querySelectorAll<HTMLButtonElement>('.chip[data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-cat]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      cat = chip.dataset.cat!;
      apply();
    });
  });
</script>

<style>
  #concept-search {
    width: 100%; padding: 0.6rem 0.9rem; font-size: 1rem;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--bg); color: var(--fg); font-family: var(--sans);
  }
  .concept-list { list-style: none; padding: 0; }
  .concept summary { cursor: pointer; }
  .concept p { margin: 0.5rem 0 0; }
</style>
```

- [ ] **Step 3: build 驗證**

```bash
npm run build 2>&1 | tee /tmp/build.log
grep -c 'class="card concept"' dist/crossley/concepts/index.html
grep '待對位' /tmp/build.log || echo "anchor 全部有效"
```

Expected: 63；anchor 警告若出現，回頭修 concepts.yaml 的 heading（逐字複製導讀標題）。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: 概念索引頁（搜尋、分類篩選、跨篇對映與 anchor 驗證）"
```

---

### Task 7: themes.yaml＋主題對照頁 `/crossley/themes/`

**Files:**
- Create: `src/data/themes.yaml`
- Create: `src/pages/crossley/themes.astro`

**Interfaces:**
- Consumes: collection `notes`、github-slugger（同 Task 6 的 anchor 驗證邏輯）。
- Produces: `src/data/themes.yaml` schema：

```yaml
- id: music-worlds-vs-subculture
  title: music worlds 對次文化概念
  entries:
    - note: 2015-snmw-ch1
      heading: "一、開場：從次文化的破產到 music worlds 的選擇（pp. 1–2，無小標題）"
      pages: "pp. 1–2"
      excerpt: |
        （此處逐字複製該小節「（a）核心論點」下的導讀文字）
```

- [ ] **Step 1: 編纂 themes.yaml**

四個主題，每主題的來源小節如下（heading 逐字複製導讀標題；excerpt 逐字複製該小節下最能代表論點的 1–3 段導讀文字，**一字不改**；該文本無相關段落則省略該 entry）：

| 主題 id | 2008 篇 | Ch1 | Ch2 |
|---|---|---|---|
| `punk-network`（punk 網絡案例） | `5. 早期英國 punk：把點連起來（pp. 96–100）——網絡的質性描述` | — | `（三）Levels of analysis（pp. 20–26）`（punk 示範段落） |
| `music-worlds-vs-subculture`（music worlds 對次文化） | `3. 英國 punk 是什麼？（pp. 92–94）` | `一、開場：從次文化的破產到 music worlds 的選擇（pp. 1–2，無小標題）` | — |
| `social-capital`（社會資本） | `8. 權力與衝突（pp. 107–110）` | `四、Social capital（pp. 5–6）` | — |
| `bourdieu`（對 Bourdieu 的態度） | 讀 `1. 導論（pp. 89–91）`，若無 Bourdieu 相關文字則省略 | `五、Diffusion, taste formation and social space（pp. 6–8）` 之 `對 Bourdieu 的態度（p. 8，本章最重要的理論表態）` | — |

編纂時開啟 `src/content/notes/*.md` 逐字複製；完成後每個主題至少要有 2 個 entries，否則刪除該主題。

- [ ] **Step 2: 寫頁面**

`src/pages/crossley/themes.astro`：

```astro
---
import fs from 'node:fs';
import yaml from 'js-yaml';
import GithubSlugger from 'github-slugger';
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';

interface Entry { note: string; heading: string; pages: string; excerpt: string }
interface Theme { id: string; title: string; entries: Entry[] }
const themes = yaml.load(fs.readFileSync('src/data/themes.yaml', 'utf8')) as Theme[];

const notes = await getCollection('notes');
const titleOf = new Map(notes.map((n) => [n.id, n.data.title]));
const slugger = new GithubSlugger();
function hrefOf(e: Entry): string | null {
  const target = notes.find((n) => n.id === e.note);
  const found = target && (target.body ?? '').split('\n')
    .some((l) => l.replace(/^#+\s*/, '').trim() === e.heading);
  if (!found) {
    console.warn(`[themes.yaml] 待對位：${e.note} 無標題「${e.heading}」`);
    return null;
  }
  slugger.reset();
  return `/crossley/notes/${e.note}/#${slugger.slug(e.heading)}`;
}
const enriched = themes.map((t) => ({
  ...t,
  entries: t.entries.map((e) => ({ ...e, href: hrefOf(e), noteTitle: titleOf.get(e.note) ?? e.note })),
}));
---
<Base title="主題對照">
  <h1>跨文本主題對照</h1>
  <p class="muted">
    同一主題在各文本的說法並排。摘錄逐字取自導讀（選取與並排是編輯行為，文字本身零改寫），附原書頁碼。
  </p>
  <div class="chips" role="tablist" aria-label="主題">
    {enriched.map((t, i) => (
      <button class="chip" role="tab" data-theme={t.id} aria-pressed={i === 0 ? 'true' : 'false'}>{t.title}</button>
    ))}
  </div>
  {enriched.map((t, i) => (
    <section class="theme-panel" data-theme={t.id} hidden={i !== 0}>
      <div class="theme-columns">
        {t.entries.map((e) => (
          <article class="card">
            <h3 style="margin-top:0;">{e.noteTitle}</h3>
            <p class="muted" style="font-size:0.82rem;">{e.heading}｜{e.pages}</p>
            <div class="theme-excerpt">{e.excerpt}</div>
            {e.href
              ? <a href={e.href} style="font-size:0.85rem;">回到導讀上下文 →</a>
              : <span class="muted" style="font-size:0.85rem;">來源段落待對位</span>}
          </article>
        ))}
      </div>
    </section>
  ))}
</Base>

<script>
  document.querySelectorAll<HTMLButtonElement>('.chip[data-theme]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-theme]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      document.querySelectorAll<HTMLElement>('.theme-panel').forEach((p) => {
        p.hidden = p.dataset.theme !== chip.dataset.theme;
      });
    });
  });
</script>

<style>
  .theme-columns { display: grid; grid-template-columns: 1fr; gap: 1rem; }
  @media (min-width: 60rem) {
    .theme-columns { grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
    main:has(.theme-columns) { max-width: 64em; }
  }
  .theme-excerpt { white-space: pre-line; font-size: 0.95rem; }
</style>
```

- [ ] **Step 3: build 驗證**

```bash
npm run build 2>&1 | tee /tmp/build.log
grep '待對位' /tmp/build.log || echo "anchor 全部有效"
```

Expected: build 成功；有警告就修 themes.yaml 的 heading。

- [ ] **Step 4: 摘錄忠實性抽查**

隨機抽兩則 excerpt，各取其中一整句在權威文本 grep：

```bash
grep -F "<抽查句>" ~/Developer/research_library/Nick\ Crossley/notes/*.md
```

Expected: 每句都能命中（證明逐字）。抽查不過＝excerpt 被改寫，回去重新複製。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 跨文本主題對照頁（themes.yaml 編纂＋anchor 驗證）"
```

---

### Task 8: 第一輯首頁 `/crossley/`（閱讀地圖）

**Files:**
- Create: `src/pages/crossley/index.astro`

**Interfaces:**
- Consumes: collection `notes`。閱讀狀態（排隊中清單、出版譜系）的文字依據：`notes/README.md`（權威索引）。

- [ ] **Step 1: 寫頁面**

`src/pages/crossley/index.astro`（「排隊中」與「譜系」文字取自 notes/README.md 的既有描述）：

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
const notes = (await getCollection('notes')).sort((a, b) => a.data.order - b.data.order);
const queue = [
  {
    title: '《SNMW》Ch11 “On jazz worlds”（McAndrew, Widdop & Stevenson）',
    desc: '900 位英國爵士樂手的名鑑網絡，與 ghouse 方法最可比。前導可搭 Ch4（McAndrew & Everett 女性作曲家篇）。',
  },
  {
    title: '《Networks of Sound, Style and Subversion》（2015 專書）',
    desc: 'Pretty Connected 的完整擴充版（四城市 punk／post-punk）。',
  },
  {
    title: '《SNMW》Ch3 “Totally wired”',
    desc: '專書 post-punk 部分的濃縮，可當專書的預覽。',
  },
];
---
<Base title="Crossley 精讀">
  <h1>第一輯：Nick Crossley 的音樂社會網絡研究</h1>
  <p class="muted">閱讀目標：理解 Crossley 的音樂社會網絡研究（純理論吸收）。</p>

  <h2>出版譜系</h2>
  <p>
    2008 期刊文（倫敦 punk）→ 2015 專書（四城市）→ 2015 論文集（方法標準化）。
    論文集 Ch1／Ch2 是為書新寫，非舊文重刊。
  </p>

  <h2>已完成導讀</h2>
  {notes.map((n) => (
    <a class="card" href={`/crossley/notes/${n.id}/`} style="display:block; text-decoration:none; color:inherit;">
      <h3 style="margin:0;">{n.data.title}</h3>
      <p class="muted" style="margin:0.3rem 0 0; font-size:0.85rem;">{n.data.source}</p>
    </a>
  ))}

  <h2>排隊中（下一輪）</h2>
  {queue.map((q) => (
    <div class="card" style="opacity:0.75;">
      <h3 style="margin:0; font-size:1rem;">{q.title}</h3>
      <p class="muted" style="margin:0.3rem 0 0; font-size:0.85rem;">{q.desc}</p>
    </div>
  ))}

  <h2>交叉工具</h2>
  <p>
    <a href="/crossley/concepts/">概念索引</a>｜
    <a href="/crossley/themes/">主題對照</a>｜
    <a href="/crossley/quotes/">引文庫</a>
  </p>
</Base>
```

- [ ] **Step 2: build 驗證＋commit**

```bash
npm run build && grep -c 'card' dist/crossley/index.html
```

Expected: build 成功，數字 ≥ 6（三張已完成＋三張排隊卡片）。

```bash
git add -A
git commit -m "feat: Crossley 第一輯首頁（閱讀地圖）"
```

---

### Task 9: 註記系統核心（選取→面板→localStorage→高亮）

**Files:**
- Create: `public/annotations.js`
- Modify: `src/layouts/Base.astro`（引入 script）
- Modify: `src/styles/global.css`（附加註記 UI 樣式）

**Interfaces:**
- Produces: localStorage key `bkwmt-annotations`，值為 JSON 陣列：

```ts
interface Annotation {
  id: string;          // crypto.randomUUID()
  page: string;        // note slug（data-note）；非導讀頁不可註記
  pageTitle: string;   // data-note-title
  section: string;     // 選取處往前最近的 h2/h3 文字
  exact: string;       // 選取原文
  prefix: string;      // 前文 ≤30 字
  suffix: string;      // 後文 ≤30 字
  type: '勘誤' | '提問';
  comment: string;
  created: string;     // ISO 8601
}
```

- 高亮用 CSS Custom Highlight API（`CSS.highlights`），不支援的瀏覽器僅略過高亮（註記與面板功能不受影響）。Task 10 讀同一 storage key。

- [ ] **Step 1: 寫 annotations.js（核心）**

`public/annotations.js`：

```js
// 註記系統：選取文字 → 記註（勘誤／提問）→ localStorage → 重訪高亮。
// 錨定採 text quote anchoring（exact + prefix/suffix），不依賴 DOM 位置。
(() => {
  const KEY = 'bkwmt-annotations';
  const CTX = 30; // prefix/suffix 長度

  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  };
  const save = (list) => localStorage.setItem(KEY, JSON.stringify(list));

  const article = document.querySelector('article.note-body');

  // ---------- 高亮重放（僅導讀頁） ----------
  function fullText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text = '';
    const spans = []; // { node, start }
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      spans.push({ node: n, start: text.length });
      text += n.nodeValue;
    }
    return { text, spans };
  }

  function locate(text, spans, ann) {
    // 找 exact 的出現位置；多次出現時用 prefix/suffix 消歧
    let best = -1;
    let i = text.indexOf(ann.exact);
    while (i !== -1) {
      const pre = text.slice(Math.max(0, i - CTX), i);
      const suf = text.slice(i + ann.exact.length, i + ann.exact.length + CTX);
      if ((!ann.prefix || pre.endsWith(ann.prefix.slice(-10))) &&
          (!ann.suffix || suf.startsWith(ann.suffix.slice(0, 10)))) { best = i; break; }
      if (best === -1) best = i; // 消歧失敗仍取第一次出現
      i = text.indexOf(ann.exact, i + 1);
    }
    if (best === -1) return null;
    const end = best + ann.exact.length;
    const range = document.createRange();
    let s = null, e = null;
    for (const sp of spans) {
      const len = sp.node.nodeValue.length;
      if (!s && best < sp.start + len) { s = sp; range.setStart(sp.node, best - sp.start); }
      if (end <= sp.start + len) { e = sp; range.setEnd(sp.node, end - sp.start); break; }
    }
    return s && e ? range : null;
  }

  function replayHighlights() {
    if (!article || !('highlights' in CSS)) return;
    const slug = article.dataset.note;
    const anns = load().filter((a) => a.page === slug);
    if (!anns.length) return;
    const { text, spans } = fullText(article);
    const ranges = anns.map((a) => locate(text, spans, a)).filter(Boolean);
    if (ranges.length) CSS.highlights.set('annotations', new Highlight(...ranges));
  }

  // ---------- 選取 → 浮動按鈕 → 面板 ----------
  const fab = document.createElement('button');
  fab.id = 'ann-fab';
  fab.textContent = '註記';
  fab.hidden = true;
  document.body.appendChild(fab);

  let pending = null; // { exact, prefix, suffix, section }

  function sectionOf(node) {
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== article) {
      let p = el.previousElementSibling;
      while (p) {
        if (/^H[23]$/.test(p.tagName)) return p.textContent.trim();
        p = p.previousElementSibling;
      }
      el = el.parentElement;
    }
    return '';
  }

  function onSelect() {
    const sel = window.getSelection();
    if (!article || !sel || sel.isCollapsed || !sel.rangeCount) { fab.hidden = true; return; }
    const range = sel.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) { fab.hidden = true; return; }
    const exact = sel.toString();
    if (!exact.trim()) { fab.hidden = true; return; }
    const { text } = fullText(article);
    const idx = text.indexOf(exact);
    pending = {
      exact,
      prefix: idx > 0 ? text.slice(Math.max(0, idx - CTX), idx) : '',
      suffix: idx !== -1 ? text.slice(idx + exact.length, idx + exact.length + CTX) : '',
      section: sectionOf(range.startContainer),
    };
    const rect = range.getBoundingClientRect();
    fab.style.top = `${rect.bottom + window.scrollY + 8}px`;
    fab.style.left = `${rect.left + window.scrollX}px`;
    fab.hidden = false;
  }
  document.addEventListener('mouseup', () => setTimeout(onSelect, 0));
  document.addEventListener('touchend', () => setTimeout(onSelect, 0));

  // ---------- 記註面板 ----------
  const panel = document.createElement('div');
  panel.id = 'ann-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <blockquote id="ann-quote"></blockquote>
    <div role="radiogroup" aria-label="類型">
      <label><input type="radio" name="ann-type" value="勘誤" checked> 勘誤</label>
      <label><input type="radio" name="ann-type" value="提問"> 提問</label>
    </div>
    <textarea id="ann-comment" rows="3" placeholder="寫下勘誤或提問⋯"></textarea>
    <div class="ann-actions">
      <button id="ann-save">儲存</button>
      <button id="ann-cancel">取消</button>
    </div>`;
  document.body.appendChild(panel);

  fab.addEventListener('click', () => {
    if (!pending) return;
    panel.querySelector('#ann-quote').textContent =
      pending.exact.length > 120 ? pending.exact.slice(0, 120) + '⋯' : pending.exact;
    panel.querySelector('#ann-comment').value = '';
    panel.hidden = false;
    fab.hidden = true;
    panel.querySelector('#ann-comment').focus();
  });
  panel.querySelector('#ann-cancel').addEventListener('click', () => { panel.hidden = true; });
  panel.querySelector('#ann-save').addEventListener('click', () => {
    const comment = panel.querySelector('#ann-comment').value.trim();
    if (!comment || !pending || !article) return;
    const list = load();
    list.push({
      id: crypto.randomUUID(),
      page: article.dataset.note,
      pageTitle: article.dataset.noteTitle,
      section: pending.section,
      exact: pending.exact,
      prefix: pending.prefix,
      suffix: pending.suffix,
      type: panel.querySelector('input[name="ann-type"]:checked').value,
      comment,
      created: new Date().toISOString(),
    });
    save(list);
    panel.hidden = true;
    pending = null;
    replayHighlights();
    window.dispatchEvent(new CustomEvent('annotations-changed'));
  });

  replayHighlights();
  window.__annStore = { KEY, load, save }; // Task 10 的管理面板共用
})();
```

- [ ] **Step 2: Base.astro 引入＋樣式**

`Base.astro` 的 `</body>` 前加：

```html
<script src="/annotations.js" is:inline defer></script>
```

`global.css` 附加：

```css
/* 註記 UI */
::highlight(annotations) { background-color: var(--highlight); }
#ann-fab {
  position: absolute; z-index: 60;
  border: 1px solid var(--accent); border-radius: 999px;
  background: var(--bg); color: var(--accent);
  padding: 0.25rem 0.8rem; font-size: 0.85rem; cursor: pointer; font-family: var(--sans);
}
#ann-panel {
  position: fixed; z-index: 70; left: 50%; bottom: 1.5rem; transform: translateX(-50%);
  width: min(92vw, 26rem); background: var(--bg);
  border: 1px solid var(--border); border-radius: 12px; padding: 1rem;
  box-shadow: 0 8px 30px rgba(0,0,0,0.25);
}
#ann-panel blockquote {
  margin: 0 0 0.6rem; padding: 0.2rem 0.8rem;
  border-left: 3px solid var(--accent); color: var(--muted); font-size: 0.85rem;
}
#ann-panel textarea {
  width: 100%; margin-top: 0.5rem; padding: 0.5rem;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg); color: var(--fg); font-family: var(--sans);
}
#ann-panel .ann-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.6rem; }
#ann-panel button {
  border: 1px solid var(--border); border-radius: 6px; background: none;
  color: var(--fg); padding: 0.3rem 0.9rem; cursor: pointer; font-family: var(--sans);
}
#ann-panel #ann-save { border-color: var(--accent); color: var(--accent); }
```

- [ ] **Step 3: 手動驗證**

```bash
npm run dev
```

瀏覽器開 `http://localhost:4321/crossley/notes/2015-snmw-ch1/`：選取一段文字 → 出現「註記」鈕 → 面板存一筆 → 重新整理 → 該段淡色高亮。DevTools 檢查 `localStorage.getItem('bkwmt-annotations')` 內容欄位齊全。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: 註記系統核心（text quote anchoring＋localStorage＋高亮）"
```

---

### Task 10: 註記管理面板＋匯出

**Files:**
- Modify: `public/annotations.js`（附加管理面板段落）
- Modify: `src/styles/global.css`（附加面板樣式）

**Interfaces:**
- Consumes: `window.__annStore`（Task 9）。
- Produces: 右下角「我的註記（N）」按鈕（所有頁面）；面板列出全部註記、單則刪除、匯出 .md 下載、複製剪貼簿。匯出格式（spec 第 6 節）：

```markdown
## 註記 1（勘誤）
- 頁面：2015-snmw-ch2
- 小節：（三）Levels of analysis（pp. 20–26）
- 選取原文：「⋯⋯」
- 註記：⋯⋯
- 時間：2026-07-26 14:32
```

- [ ] **Step 1: annotations.js 附加管理面板**

在 `window.__annStore = ...` 之前附加：

```js
  // ---------- 我的註記：管理面板＋匯出 ----------
  const mgrBtn = document.createElement('button');
  mgrBtn.id = 'ann-mgr-btn';
  document.body.appendChild(mgrBtn);

  const mgr = document.createElement('div');
  mgr.id = 'ann-mgr';
  mgr.hidden = true;
  document.body.appendChild(mgr);

  const fmtTime = (iso) => {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  function toMarkdown(list) {
    const lines = ['# 網站註記匯出', ''];
    list.forEach((a, i) => {
      lines.push(
        `## 註記 ${i + 1}（${a.type}）`,
        `- 頁面：${a.page}`,
        `- 小節：${a.section || '（未定位）'}`,
        `- 選取原文：「${a.exact}」`,
        `- 註記：${a.comment}`,
        `- 時間：${fmtTime(a.created)}`,
        '',
      );
    });
    return lines.join('\n');
  }

  function renderMgr() {
    const list = load();
    mgrBtn.textContent = `我的註記（${list.length}）`;
    const items = list.map((a, i) => `
      <li class="ann-item" data-id="${a.id}">
        <span class="ann-meta">${a.type}｜${a.pageTitle}｜${fmtTime(a.created)}</span>
        <blockquote>${a.exact.length > 80 ? a.exact.slice(0, 80) + '⋯' : a.exact}</blockquote>
        <p>${a.comment}</p>
        <button class="ann-del" data-id="${a.id}">刪除</button>
      </li>`).join('');
    mgr.innerHTML = `
      <header>
        <strong>我的註記（${list.length} 則）</strong>
        <button id="ann-mgr-close" aria-label="關閉">×</button>
      </header>
      <p class="ann-hint">註記存在此瀏覽器的 localStorage，清除瀏覽資料前請先匯出。</p>
      <div class="ann-actions">
        <button id="ann-export" ${list.length ? '' : 'disabled'}>匯出 .md</button>
        <button id="ann-copy" ${list.length ? '' : 'disabled'}>複製全部</button>
      </div>
      <ul>${items || '<li class="ann-meta">尚無註記。到導讀頁選取文字即可記註。</li>'}</ul>`;
    mgr.querySelector('#ann-mgr-close').addEventListener('click', () => { mgr.hidden = true; });
    mgr.querySelector('#ann-export')?.addEventListener('click', () => {
      const blob = new Blob([toMarkdown(load())], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `annotations-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    mgr.querySelector('#ann-copy')?.addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(toMarkdown(load()));
      e.target.textContent = '已複製';
      setTimeout(() => (e.target.textContent = '複製全部'), 1200);
    });
    mgr.querySelectorAll('.ann-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        save(load().filter((a) => a.id !== btn.dataset.id));
        renderMgr();
        replayHighlights();
      });
    });
  }

  mgrBtn.addEventListener('click', () => {
    mgr.hidden = !mgr.hidden;
    if (!mgr.hidden) renderMgr();
  });
  window.addEventListener('annotations-changed', renderMgr);
  renderMgr();
```

- [ ] **Step 2: global.css 附加面板樣式**

```css
#ann-mgr-btn {
  position: fixed; left: 1rem; bottom: 1rem; z-index: 50;
  border: 1px solid var(--border); border-radius: 999px;
  background: var(--bg); color: var(--muted);
  padding: 0.5rem 1rem; font-size: 0.85rem; cursor: pointer; font-family: var(--sans);
}
#ann-mgr {
  position: fixed; z-index: 70; left: 1rem; bottom: 4rem;
  width: min(92vw, 24rem); max-height: 65vh; overflow-y: auto;
  background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
  padding: 1rem; box-shadow: 0 8px 30px rgba(0,0,0,0.25);
}
#ann-mgr header { display: flex; justify-content: space-between; align-items: center; }
#ann-mgr ul { list-style: none; padding: 0; margin: 0.5rem 0 0; }
#ann-mgr .ann-item { border-top: 1px solid var(--border); padding: 0.6rem 0; }
#ann-mgr .ann-meta { color: var(--muted); font-size: 0.78rem; }
#ann-mgr .ann-hint { color: var(--muted); font-size: 0.78rem; margin: 0.3rem 0; }
#ann-mgr blockquote {
  margin: 0.3rem 0; padding: 0.1rem 0.6rem;
  border-left: 2px solid var(--border); color: var(--muted); font-size: 0.82rem;
}
#ann-mgr p { margin: 0.2rem 0; font-size: 0.9rem; }
#ann-mgr button { font-family: var(--sans); cursor: pointer; }
#ann-mgr .ann-del {
  border: none; background: none; color: var(--muted); font-size: 0.78rem;
  text-decoration: underline; padding: 0;
}
#ann-mgr-close { border: none; background: none; color: var(--fg); font-size: 1.1rem; }
```

- [ ] **Step 3: 手動驗證**

dev server 下：記兩筆註記（一勘誤一提問）→ 開「我的註記（2）」→ 匯出 .md，確認格式含頁面／小節／選取原文／註記／時間 → 刪除一筆 → 高亮同步消失。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: 註記管理面板與 Markdown 匯出"
```

---

### Task 11: Playwright 煙霧測試

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json`（加 `test:e2e` script）

**Interfaces:**
- Consumes: 全站頁面與 `bkwmt-annotations` storage key。

- [ ] **Step 1: 安裝與設定**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`：

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
```

`package.json` scripts 加：`"test:e2e": "playwright test"`。

- [ ] **Step 2: 寫煙霧測試**

`e2e/smoke.spec.ts`：

```ts
import { test, expect } from '@playwright/test';

test('概念索引：搜尋過濾', async ({ page }) => {
  await page.goto('/crossley/concepts/');
  const items = page.locator('.concept:visible');
  await expect(items).toHaveCount(63);
  await page.fill('#concept-search', 'node');
  await expect(items.first()).toContainText('節點');
  expect(await items.count()).toBeLessThan(63);
});

test('引文庫：文本篩選與卡片渲染', async ({ page }) => {
  await page.goto('/crossley/quotes/');
  await expect(page.locator('.quote-card').first()).toBeVisible();
  await page.click('.chip[data-filter="2015-snmw-ch2"]');
  await expect(page.locator('section[data-group="2015-snmw-ch1"]')).toBeHidden();
});

test('註記：建立→出現在管理面板→匯出格式', async ({ page }) => {
  await page.goto('/crossley/notes/2015-snmw-ch1/');
  // 以程式選取 article 內第一個段落的前 20 字並觸發 mouseup
  await page.evaluate(() => {
    const p = document.querySelector('article.note-body p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, Math.min(20, p.firstChild!.textContent!.length));
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new MouseEvent('mouseup'));
  });
  await page.click('#ann-fab');
  await page.fill('#ann-comment', '測試提問內容');
  await page.check('input[name="ann-type"][value="提問"]');
  await page.click('#ann-save');
  await page.click('#ann-mgr-btn');
  await expect(page.locator('#ann-mgr')).toContainText('我的註記（1 則）');
  await expect(page.locator('#ann-mgr')).toContainText('測試提問內容');
  const md = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bkwmt-annotations')!),
  );
  expect(md[0]).toMatchObject({ type: '提問', comment: '測試提問內容', page: '2015-snmw-ch1' });
  expect(md[0].exact.length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: 跑測試**

```bash
npm run test:e2e
```

Expected: 3 passed。失敗就修（常見：selector 與實作不一致——以實作為準改測試，或發現真 bug 修實作）。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: Playwright 煙霧測試（概念搜尋、引文篩選、註記流程）"
```

---

### Task 12: 部署（GitHub Actions → GitHub Pages）

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`（repo 說明）

**Interfaces:**
- Consumes: 完整可 build 的專案。
- Produces: push `main` 自動部署到 `https://bkwmt.github.io`。

- [ ] **Step 1: 寫 workflow**

`.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: 改寫 README.md**

```markdown
# bkwmt.github.io — 文獻筆記站

文獻精讀筆記的發布站。第一輯：Nick Crossley 的音樂社會網絡研究。

## 資料源

`~/Developer/research_library/Nick Crossley/notes/*.md` 是唯一權威資料源。
`src/content/notes/` 是 `npm run sync` 的產物（需 commit，CI build 用）。

## 新導讀上線流程

1. 在 research_library 寫完導讀（關鍵句區塊標題建議統一用 `### 關鍵句`）
2. 在 `scripts/sync-notes.sh` 加一行 `sync_one`
3. `npm run sync && npm test && npm run build`
4. 視需要補 `src/data/themes.yaml`、`src/data/concepts.yaml`
5. commit → push `main` → GitHub Actions 自動部署

## 指令

- `npm run dev` 本機預覽
- `npm run sync` 同步導讀
- `npm test` 解析器單元測試
- `npm run test:e2e` Playwright 煙霧測試
```

- [ ] **Step 3: 設定 Pages 用 Actions 部署**

```bash
gh api -X POST repos/bkwmt/bkwmt.github.io/pages -f build_type=actions 2>/dev/null \
  || gh api -X PUT repos/bkwmt/bkwmt.github.io/pages -f build_type=actions
```

Expected: 回傳 JSON 含 `"build_type": "actions"`。

- [ ] **Step 4: commit、merge、push、驗證部署**

```bash
git add -A
git commit -m "ci: GitHub Pages 部署 workflow 與 README"
git checkout main
git merge site-design --no-ff -m "feat: 文獻筆記站第一版（Crossley 第一輯）"
git push origin main
gh run watch --exit-status
```

Expected: workflow 成功。然後：

```bash
curl -sI https://bkwmt.github.io/ | head -1
curl -s https://bkwmt.github.io/crossley/ | grep -o '第一輯：[^<]*'
```

Expected: `HTTP/2 200`；抓到「第一輯：Nick Crossley 的音樂社會網絡研究」。

---

### Task 13: 工作區登記

**Files:**
- Modify: `~/Developer/CLAUDE.md`（「已建記憶入口的專案」清單加一行）

- [ ] **Step 1: 登記**

在 `~/Developer/CLAUDE.md` 的「已建記憶入口的專案」清單加：

```markdown
- **bkwmt.github.io/** — 文獻筆記站（GitHub Pages；Astro；第一輯 Crossley 精讀，資料源在 research_library/Nick Crossley/notes/，`npm run sync` 同步）。入口 bkwmt.github.io/README.md。
```

- [ ] **Step 2: 手機實測提醒（回報使用者）**

部署完成後提醒使用者：用手機開 `https://bkwmt.github.io/crossley/notes/2015-snmw-ch1/`，實測選取→註記→匯出流程（觸控選取的行為桌機模擬不到，需真機確認）。

---

## Self-Review 紀錄

- **Spec 覆蓋**：§3 資訊架構（Tasks 1, 2, 5, 6, 7, 8）、§4 資料流（Tasks 2, 3, 4, 6, 7）、§5 互動（Tasks 2, 5, 6, 7）、§6 註記（Tasks 9, 10）、§7 視覺（Tasks 1, 2 的 CSS）、§8 錯誤處理（sync WARN、anchor 待對位、註記待對位＝locate 回傳 null 時不高亮但保留）、§9 測試（Tasks 3, 4, 11）、§10-11（README 新導讀流程、Task 13 登記）。
- **已知簡化**：spec §8「註記待對位清單」在管理面板一律列出全部註記（含定位失敗者），僅高亮省略——符合「不消失」要求，未另做「待對位」標記（YAGNI）。
- **型別一致性**：`Quote`／`Concept` 介面在 Tasks 3–7 引用一致；storage key `bkwmt-annotations` 在 Tasks 9–11 一致；`data-note`／`data-note-title` 在 Tasks 2, 9 一致。
