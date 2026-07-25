// 註記系統：選取文字 → 記註（勘誤／提問）→ localStorage → 重訪高亮。
// 錨定採 text quote anchoring（exact + prefix/suffix），不依賴 DOM 位置。
(() => {
  const KEY = 'bkwmt-annotations';
  const CTX = 30; // prefix/suffix 長度

  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  };
  const save = (list) => localStorage.setItem(KEY, JSON.stringify(list));

  const article = document.querySelector('article.note-body');

  // ---------- 高亮重放（僅導讀頁） ----------
  function fullText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text = '';
    const spans = []; // { node, start }
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      spans.push({ node: n, start: text.length });
      text += n.nodeValue;
    }
    return { text, spans };
  }

  function locate(text, spans, ann) {
    // 找 exact 的出現位置；多次出現時用 prefix/suffix 消歧
    let best = -1;
    let i = text.indexOf(ann.exact);
    while (i !== -1) {
      const pre = text.slice(Math.max(0, i - CTX), i);
      const suf = text.slice(i + ann.exact.length, i + ann.exact.length + CTX);
      if ((!ann.prefix || pre.endsWith(ann.prefix.slice(-10))) &&
          (!ann.suffix || suf.startsWith(ann.suffix.slice(0, 10)))) { best = i; break; }
      if (best === -1) best = i; // 消歧失敗仍取第一次出現
      i = text.indexOf(ann.exact, i + 1);
    }
    if (best === -1) return null;
    const end = best + ann.exact.length;
    const range = document.createRange();
    let s = null, e = null;
    for (const sp of spans) {
      const len = sp.node.nodeValue.length;
      if (!s && best < sp.start + len) { s = sp; range.setStart(sp.node, best - sp.start); }
      if (end <= sp.start + len) { e = sp; range.setEnd(sp.node, end - sp.start); break; }
    }
    return s && e ? range : null;
  }

  function replayHighlights() {
    if (!article || !('highlights' in CSS)) return;
    const slug = article.dataset.note;
    const anns = load().filter((a) => a.page === slug);
    if (!anns.length) return;
    const { text, spans } = fullText(article);
    const ranges = anns.map((a) => locate(text, spans, a)).filter(Boolean);
    if (ranges.length) CSS.highlights.set('annotations', new Highlight(...ranges));
  }

  // ---------- 選取 → 浮動按鈕 → 面板 ----------
  const fab = document.createElement('button');
  fab.id = 'ann-fab';
  fab.textContent = '註記';
  fab.hidden = true;
  document.body.appendChild(fab);

  let pending = null; // { exact, prefix, suffix, section }

  function offsetOf(node, nodeOffset, spans) {
    for (const sp of spans) {
      if (sp.node === node) return sp.start + nodeOffset;
    }
    return -1;
  }

  function sectionOf(node) {
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== article) {
      let p = el.previousElementSibling;
      while (p) {
        if (/^H[23]$/.test(p.tagName)) return p.textContent.trim();
        p = p.previousElementSibling;
      }
      el = el.parentElement;
    }
    return '';
  }

  function onSelect() {
    const sel = window.getSelection();
    if (!article || !sel || sel.isCollapsed || !sel.rangeCount) { fab.hidden = true; return; }
    const range = sel.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) { fab.hidden = true; return; }
    const exact = sel.toString();
    if (!exact.trim()) { fab.hidden = true; return; }
    const { text, spans } = fullText(article);
    let idx = range.startContainer.nodeType === Node.TEXT_NODE
      ? offsetOf(range.startContainer, range.startOffset, spans)
      : -1;
    // 跨元素選取時 sel.toString() 與串接文字可能有細微差異；驗證失敗就退回舊行為
    if (idx === -1 || text.slice(idx, idx + exact.length) !== exact) {
      idx = text.indexOf(exact);
    }
    pending = {
      exact,
      prefix: idx > 0 ? text.slice(Math.max(0, idx - CTX), idx) : '',
      suffix: idx !== -1 ? text.slice(idx + exact.length, idx + exact.length + CTX) : '',
      section: sectionOf(range.startContainer),
    };
    const rect = range.getBoundingClientRect();
    fab.style.top = `${rect.bottom + window.scrollY + 8}px`;
    fab.style.left = `${rect.left + window.scrollX}px`;
    fab.hidden = false;
  }
  document.addEventListener('mouseup', () => setTimeout(onSelect, 0));
  document.addEventListener('touchend', () => setTimeout(onSelect, 0));

  // ---------- 記註面板 ----------
  const panel = document.createElement('div');
  panel.id = 'ann-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <blockquote id="ann-quote"></blockquote>
    <div role="radiogroup" aria-label="類型">
      <label><input type="radio" name="ann-type" value="勘誤" checked> 勘誤</label>
      <label><input type="radio" name="ann-type" value="提問"> 提問</label>
    </div>
    <textarea id="ann-comment" rows="3" placeholder="寫下勘誤或提問⋯"></textarea>
    <div class="ann-actions">
      <button id="ann-save">儲存</button>
      <button id="ann-cancel">取消</button>
    </div>`;
  document.body.appendChild(panel);

  fab.addEventListener('click', () => {
    if (!pending) return;
    panel.querySelector('#ann-quote').textContent =
      pending.exact.length > 120 ? pending.exact.slice(0, 120) + '⋯' : pending.exact;
    panel.querySelector('#ann-comment').value = '';
    panel.hidden = false;
    fab.hidden = true;
    panel.querySelector('#ann-comment').focus();
  });
  panel.querySelector('#ann-cancel').addEventListener('click', () => { panel.hidden = true; });
  panel.querySelector('#ann-save').addEventListener('click', () => {
    const comment = panel.querySelector('#ann-comment').value.trim();
    if (!comment || !pending || !article) return;
    const list = load();
    list.push({
      id: crypto.randomUUID(),
      page: article.dataset.note,
      pageTitle: article.dataset.noteTitle,
      section: pending.section,
      exact: pending.exact,
      prefix: pending.prefix,
      suffix: pending.suffix,
      type: panel.querySelector('input[name="ann-type"]:checked').value,
      comment,
      created: new Date().toISOString(),
    });
    save(list);
    panel.hidden = true;
    pending = null;
    replayHighlights();
    window.dispatchEvent(new CustomEvent('annotations-changed'));
  });

  replayHighlights();
  window.__annStore = { KEY, load, save }; // Task 10 的管理面板共用
})();
