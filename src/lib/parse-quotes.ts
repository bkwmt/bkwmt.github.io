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
// fallback：抓不到頁碼、但仍是可辨識的引文項目 → page: ""
// 格式 A'：- 「text」（備註）？（無頁碼）
const FALLBACK_BULLET_RE = /^[-*]\s+「(.+)」(?:（(.+)）)?\s*$/;
// 格式 B'：N. 「text」（備註）？（無頁碼）
const FALLBACK_NUMBERED_RE = /^\d+\.\s+「(.+)」(?:（(.+)）)?\s*$/;

function stripQuoteMarks(s: string): { text: string; note?: string } {
  const trimmed = s.trim();
  const m = trimmed.match(/^「(.+)」(?:（(.+)）)?\s*$/);
  if (m) return { text: m[1].trim(), note: m[2]?.trim() || undefined };
  return { text: trimmed };
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
      quotes.push({ text: a[1].trim(), page: a[2].trim(), note: a[3]?.trim() || undefined, section });
      continue;
    }
    const b = line.match(NUMBERED_RE);
    if (b) {
      const { text, note } = stripQuoteMarks(b[2]);
      quotes.push({ text, page: b[1].trim(), note, section });
      continue;
    }
    // page 抓不到：fallback 為帶引號但無頁碼的項目，page: ""
    const c = line.match(FALLBACK_BULLET_RE);
    if (c) {
      quotes.push({ text: c[1].trim(), page: '', note: c[2]?.trim() || undefined, section });
      continue;
    }
    const d = line.match(FALLBACK_NUMBERED_RE);
    if (d) {
      quotes.push({ text: d[1].trim(), page: '', note: d[2]?.trim() || undefined, section });
    }
  }
  return quotes;
}
