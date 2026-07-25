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
