import { describe, it, expect } from 'vitest';
import { parseConcepts } from '../src/lib/parse-concepts';

const FIXTURE = `
## 二、全章技術概念清單（63 項，依出現順序）

1. **musicking**——音樂作為集體行動的總稱（Small）。
2. **節點（node/vertex）**——被連結（或未被連結）的對象；任何事物只要界定得有意義都可作節點。
9. **正／負向連帶（positive/negative ties）**——霸凌、互嗆亦可分析。
44. **同構（isomorphic）／節點標籤（node labels）**——結構等價的狀態。
56. **交錯的社會圈（intersecting social circles, Simmel）／net doms（White 2008）**——個人是多個世界的交會點。

## 三、圖表描述

1. **不是概念**——不應被抓到。
`;

describe('parseConcepts', () => {
  const concepts = parseConcepts(FIXTURE);

  it('只抓概念清單區塊內的項目', () => {
    expect(concepts).toHaveLength(5);
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
  it('多組全形括號詞條（每段皆有括號）應各自拆解後以斜線重組', () => {
    expect(concepts[3].term).toBe('同構／節點標籤');
    expect(concepts[3].original).toBe('isomorphic／node labels');
    expect(concepts[4].term).toBe('交錯的社會圈／net doms');
    expect(concepts[4].original).toBe('intersecting social circles, Simmel／White 2008');
  });
  it('無概念清單區塊回傳空陣列', () => {
    expect(parseConcepts('## 一、逐節萃取\n\n1. **x**——y')).toEqual([]);
  });
});
