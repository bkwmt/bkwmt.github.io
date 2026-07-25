import { describe, it, expect } from 'vitest';
import { buildAnchorMap, resolveAnchor } from '../src/lib/heading-anchors';

const UNIQUE = `
# 導讀：某文獻

## 一、開場

內文略。

### （a）核心論點

內文略。

## 二、結語
`;

const DUP_HEADINGS = `
# 導讀：某文獻

## 一、開場

### （a）核心論點

內文略。

### （b）論證步驟

內文略。

## 二、結語

### （a）核心論點

內文略（與上方標題文字重複）。

### （b）論證步驟

內文略。

### 三、後續小節
`;

const SLUG_COLLISION = `
## Node A!

內文略。

## Node A?

內文略。

## 三、後面標題
`;

const FENCED = `
## 一、程式碼區塊

\`\`\`
# 這是 code fence 內的 # 註解，不是標題
## 也不是
\`\`\`

## 二、真正的標題
`;

describe('buildAnchorMap：唯一標題', () => {
  const map = buildAnchorMap(UNIQUE);

  it('每個標題都對到唯一 slug', () => {
    expect(map.get('一、開場')).toBe('一開場');
    expect(map.get('（a）核心論點')).toBe('a核心論點');
    expect(map.get('二、結語')).toBe('二結語');
  });
});

describe('buildAnchorMap：標題文字重複視為歧義', () => {
  const map = buildAnchorMap(DUP_HEADINGS);

  it('重複文字的標題對應 null（不猜第一個）', () => {
    expect(map.get('（a）核心論點')).toBeNull();
    expect(map.get('（b）論證步驟')).toBeNull();
  });

  it('文件順序中，重複標題之後出現的獨立標題仍能正確對位（驗證去重不影響後續 slug）', () => {
    // 「二、結語」在 DUP_HEADINGS 只出現一次，前面已有兩組重複的 (a)(b)。
    expect(map.get('二、結語')).toBe('二結語');
    // 「三、後續小節」出現在最後，同樣唯一。
    expect(map.get('三、後續小節')).toBe('三後續小節');
  });
});

describe('buildAnchorMap：標題文字不同但 slug 會碰撞（重現 Astro 的 -1 去重後綴）', () => {
  const map = buildAnchorMap(SLUG_COLLISION);

  it('第一個標題拿到未加後綴的 slug', () => {
    expect(map.get('Node A!')).toBe('node-a');
  });

  it('第二個標題文字不同、slug 碰撞 → 拿到 -1 後綴（不是被誤判為歧義）', () => {
    expect(map.get('Node A?')).toBe('node-a-1');
  });

  it('碰撞之後的標題仍依文件順序正確對位', () => {
    expect(map.get('三、後面標題')).toBe('三後面標題');
  });
});

describe('resolveAnchor', () => {
  it('唯一標題 → 回傳 slug', () => {
    expect(resolveAnchor(UNIQUE, '一、開場')).toEqual({ slug: '一開場' });
  });

  it('缺少的標題 → missing', () => {
    expect(resolveAnchor(UNIQUE, '不存在的標題')).toEqual({ slug: null, reason: 'missing' });
  });

  it('重複文字的標題 → ambiguous', () => {
    expect(resolveAnchor(DUP_HEADINGS, '（a）核心論點')).toEqual({ slug: null, reason: 'ambiguous' });
  });
});

describe('buildAnchorMap：fenced code block 內的 # 不視為標題', () => {
  const map = buildAnchorMap(FENCED);

  it('code fence 內的假標題不會被收錄', () => {
    expect(map.has('這是 code fence 內的 # 註解，不是標題')).toBe(false);
    expect(map.has('也不是')).toBe(false);
  });

  it('fence 前後的真標題正常收錄', () => {
    expect(map.get('一、程式碼區塊')).toBe('一程式碼區塊');
    expect(map.get('二、真正的標題')).toBe('二真正的標題');
  });
});
