export interface Concept {
  index: number;
  term: string;
  original?: string;
  definition: string;
}

const H2_RE = /^##\s+(.+)$/;
const ITEM_RE = /^(\d+)\.\s+\*\*(.+?)\*\*——(.+)$/;
const TERM_RE = /^(.+?)（([^）]+)）$/;

function splitTerm(termRaw: string): { term: string; original?: string } {
  const segments = termRaw.split('／');
  if (segments.length >= 2) {
    const matches = segments.map((s) => s.match(TERM_RE));
    if (matches.every((m) => m !== null)) {
      const terms = matches.map((m) => m![1]);
      const originals = matches.map((m) => m![2]);
      return { term: terms.join('／'), original: originals.join('／') };
    }
  }
  const t = termRaw.match(TERM_RE);
  return { term: t ? t[1] : termRaw, original: t ? t[2] : undefined };
}

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
    const { term, original } = splitTerm(termRaw);
    concepts.push({
      index: Number(m[1]),
      term,
      original,
      definition: m[3].trim(),
    });
  }
  return concepts;
}
