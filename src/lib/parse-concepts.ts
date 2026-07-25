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
