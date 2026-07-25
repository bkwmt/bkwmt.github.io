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
    // 第一個 <p> 首字元子節點可能是 <em> 等行內元素（markdown 斜體），
    // 故以 TreeWalker 取得真正的文字節點，而非假設 p.firstChild 即 Text。
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode() as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, Math.min(20, textNode.textContent!.length));
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
