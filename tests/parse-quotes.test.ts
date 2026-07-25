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
