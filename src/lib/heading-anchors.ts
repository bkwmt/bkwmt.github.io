import GithubSlugger from 'github-slugger';

export interface AnchorResult {
  slug: string | null;
  reason?: 'missing' | 'ambiguous';
}

const HEADING_RE = /^#{1,6}\s+(.+)$/;
const FENCE_RE = /^\s*```/;

/**
 * 依文件順序建 heading → slug 對映，重現 Astro 的 slug 去重行為
 *（同一個 GithubSlugger 實例掃過全文，slug 碰撞時自動加 -1、-2…後綴）。
 * 標題「文字」重複出現視為歧義，對映值覆寫為 null，不猜是哪一個。
 */
export function buildAnchorMap(md: string): Map<string, string | null> {
  const map = new Map<string, string | null>();
  const slugger = new GithubSlugger();
  let inFence = false;

  for (const line of md.split('\n')) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(HEADING_RE);
    if (!m) continue;

    const heading = m[1].trim();
    const slug = slugger.slug(heading);
    map.set(heading, map.has(heading) ? null : slug);
  }

  return map;
}

/** 解析單一 heading 在該篇 md 中應對到的 anchor slug。 */
export function resolveAnchor(md: string, heading: string): AnchorResult {
  const map = buildAnchorMap(md);
  if (!map.has(heading)) return { slug: null, reason: 'missing' };
  const slug = map.get(heading)!;
  if (slug === null) return { slug: null, reason: 'ambiguous' };
  return { slug };
}
