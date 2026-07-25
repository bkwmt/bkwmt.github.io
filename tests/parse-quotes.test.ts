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

const FALLBACK_STYLE = `
## 一、無頁碼小節

### 關鍵句

- 「引文但沒有頁碼」
- 「另一則引文」（備註內容）
- 子項目沒有引號，不該被抓到

這是一段平文，不該被抓到。

3. 「編號但沒有頁碼的引文」
4. 「編號引文」（編號備註）

## 二、下一節
`;

describe('parseQuotes：頁碼偵測不到時 fallback 到 page: ""（Quote 介面契約）', () => {
  const quotes = parseQuotes(FALLBACK_STYLE);

  it('只抓到 4 則可辨識的引文項目（平文與無「」子項目被跳過）', () => {
    expect(quotes).toHaveLength(4);
  });
  it('bullet 型態：無頁碼、無備註', () => {
    expect(quotes[0].text).toBe('引文但沒有頁碼');
    expect(quotes[0].page).toBe('');
    expect(quotes[0].note).toBeUndefined();
  });
  it('bullet 型態：無頁碼、有備註', () => {
    expect(quotes[1].text).toBe('另一則引文');
    expect(quotes[1].page).toBe('');
    expect(quotes[1].note).toBe('備註內容');
  });
  it('numbered 型態：無頁碼、無備註', () => {
    expect(quotes[2].text).toBe('編號但沒有頁碼的引文');
    expect(quotes[2].page).toBe('');
    expect(quotes[2].note).toBeUndefined();
  });
  it('numbered 型態：無頁碼、有備註', () => {
    expect(quotes[3].text).toBe('編號引文');
    expect(quotes[3].page).toBe('');
    expect(quotes[3].note).toBe('編號備註');
  });
});

const MULTI_BLOCK_STYLE = `
## 一、開場

### 關鍵句（seminar 可引）

- 「First quote text.」（p. 2）

## 二、Networks and worlds

### （a）子小節

內文略。

### 關鍵句

- 「Second quote text.」（p. 4）

## 三、下一節
`;

describe('parseQuotes：同一份文件內有兩個關鍵句區塊，各自隸屬不同 h2（section 切換）', () => {
  const quotes = parseQuotes(MULTI_BLOCK_STYLE);

  it('抓到兩則，分屬兩個區塊', () => {
    expect(quotes).toHaveLength(2);
  });
  it('第一則 section 是「一、開場」', () => {
    expect(quotes[0].section).toBe('一、開場');
  });
  it('第二則 section 是「二、Networks and worlds」（lastH2 已重新指向）', () => {
    expect(quotes[1].section).toBe('二、Networks and worlds');
  });
});

const NOTE_TRAILING_STYLE = `
## 五、seminar 關鍵句選

5. p. 29：「網絡測度及其變化被用來提出問題，再由較傳統的歷史社會學取徑來回答；反之亦然。」（SNA×歷史研究的分工宣言）

## 六、下一節
`;

describe('parseQuotes：numbered「引文＋尾隨備註」型態（p. 29 型，最常見的真實形式）', () => {
  const quotes = parseQuotes(NOTE_TRAILING_STYLE);

  it('抓到一則', () => {
    expect(quotes).toHaveLength(1);
  });
  it('text 是引號內全文（內部的「；」不被誤判為備註分隔）', () => {
    expect(quotes[0].text).toBe(
      '網絡測度及其變化被用來提出問題，再由較傳統的歷史社會學取徑來回答；反之亦然。',
    );
  });
  it('page 與 note 都正確抓到', () => {
    expect(quotes[0].page).toBe('p. 29');
    expect(quotes[0].note).toBe('SNA×歷史研究的分工宣言');
  });
});

const WHITESPACE_STYLE = `
## 一、空白測試

### 關鍵句

- 「 前後有空白的引文 」（p. 5 ； 有前後空白的備註 ）
- 「 無頁碼但有空白的引文 」（ 有空白的備註 ）

3. p. 9： 「 numbered 且有空白的引文 」（ numbered 備註空白 ）
`;

describe('parseQuotes：text／note 在各路徑上都一致修剪前後空白', () => {
  const quotes = parseQuotes(WHITESPACE_STYLE);

  it('bullet＋頁碼路徑：text 與 note 都已修剪', () => {
    expect(quotes[0].text).toBe('前後有空白的引文');
    expect(quotes[0].page).toBe('p. 5');
    expect(quotes[0].note).toBe('有前後空白的備註');
  });
  it('bullet fallback（無頁碼）路徑：text 與 note 都已修剪', () => {
    expect(quotes[1].text).toBe('無頁碼但有空白的引文');
    expect(quotes[1].page).toBe('');
    expect(quotes[1].note).toBe('有空白的備註');
  });
  it('numbered 路徑：text 與 note 都已修剪', () => {
    expect(quotes[2].text).toBe('numbered 且有空白的引文');
    expect(quotes[2].page).toBe('p. 9');
    expect(quotes[2].note).toBe('numbered 備註空白');
  });
});
