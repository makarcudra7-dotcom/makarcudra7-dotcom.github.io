/* Source citations in the CMS. Only text and safe HTTP(S) links enter articles. */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s || '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const url = value => {
    try {
      const u = new URL(value);
      return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
    } catch { return ''; }
  };
  function safeInline(node) {
    if (node.nodeType === Node.TEXT_NODE) return esc(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.tagName === 'BR') return ' ';
    const inner = [...node.childNodes].map(safeInline).join('');
    if (node.tagName !== 'A') return inner;
    const href = url(node.getAttribute('href'));
    return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner;
  }
  function rows() { return [...$('#pvSources').querySelectorAll('.pv-source-row')]; }
  function contents() {
    return rows().map(row => {
      const editor = row.querySelector('[contenteditable]');
      return {
        text: editor.textContent.trim(),
        html: [...editor.childNodes].map(safeInline).join('').trim()
      };
    }).filter(item => item.text);
  }
  function update() {
    const field = $('#source'), items = contents();
    field.value = items.map(item => item.text).join('; ');
    field.dispatchEvent(new Event('input', {bubbles:true}));
  }
  function addRow(html = '') {
    const row = document.createElement('div');
    row.className = 'pv-source-row';
    row.innerHTML = '<div class="pv-source-text" contenteditable="true" role="textbox" aria-label="Текст источника" data-placeholder="Например, Роскачество — как выбрать продукты"></div><button type="button" class="btn soft pv-source-link" title="Сделать выделенные слова ссылкой">Ссылка на слово</button><button type="button" class="btn soft pv-source-remove" aria-label="Удалить источник">×</button>';
    const editor = row.querySelector('[contenteditable]');
    editor.innerHTML = html;
    editor.addEventListener('input', update);
    editor.addEventListener('paste', e => {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    const link = row.querySelector('.pv-source-link');
    link.addEventListener('pointerdown', e => e.preventDefault());
    link.addEventListener('click', () => {
      const selection = getSelection();
      if (!selection || selection.isCollapsed || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) {
        editor.focus();
        return window.flash?.('Выделите слово или фразу в источнике');
      }
      const range = selection.getRangeAt(0).cloneRange();
      const chosen = prompt('Ссылка на выделенный текст (https://...)', 'https://');
      if (chosen === null) return;
      const href = url(chosen.trim());
      if (!href) return window.flash?.('Введите ссылку с http:// или https://');
      const label = range.toString();
      range.deleteContents();
      const a = document.createElement('a');
      a.href = href; a.rel = 'noopener noreferrer'; a.target = '_blank'; a.textContent = label;
      range.insertNode(a);
      selection.removeAllRanges();
      update();
    });
    row.querySelector('.pv-source-remove').onclick = () => {
      row.remove();
      if (!rows().length) addRow();
      update();
    };
    $('#pvSources').append(row);
    return row;
  }
  function parse(source) {
    const tpl = document.createElement('template');
    tpl.innerHTML = source || '';
    const list = tpl.content.querySelector('.pv-sources');
    const nodes = list ? [...list.children].filter(el => el.tagName === 'LI') : [];
    const values = nodes.length ? nodes.map(el => el.innerHTML) : [source || ''];
    $('#pvSources').replaceChildren();
    values.forEach(value => {
      const tmp = document.createElement('div');
      tmp.innerHTML = value;
      addRow([...tmp.childNodes].map(safeInline).join(''));
    });
    update();
  }
  function init() {
    const field = $('#source');
    if (!field || $('#pvSources')) return;
    const box = document.createElement('div');
    box.id = 'pvSources';
    field.insertAdjacentElement('afterend', box);
    field.type = 'hidden';
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'btn soft pv-add-source'; add.textContent = '+ Добавить источник';
    box.insertAdjacentElement('afterend', add);
    add.onclick = () => { addRow().querySelector('[contenteditable]').focus(); update(); };
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Выделите слово в тексте источника и нажмите «Ссылка на слово». Источников может быть несколько.';
    add.insertAdjacentElement('afterend', hint);
    parse(field.value);
    const oldCollect = window.collect, oldFill = window.fill;
    window.collect = function() {
      const result = oldCollect();
      const items = contents();
      result.source = items.length ? items.map(item => item.text).join('; ') : field.value;
      result.sourceHtml = items.length
        ? `<ol class="pv-sources">${items.map(item => `<li>${item.html}</li>`).join('')}</ol>`
        : '';
      return result;
    };
    window.fill = function(value = {}) {
      oldFill(value);
      parse(value.sourceHtml || value.source || '');
    };
    document.addEventListener('click', e => {
      if (e.target.closest?.('#newArticleBtn')) setTimeout(() => parse(''), 0);
    });
    const style = document.createElement('style');
    style.textContent = '.pv-source-row{display:flex;gap:8px;align-items:start;margin:8px 0}.pv-source-text{flex:1;min-width:0;min-height:44px;border:1px solid #ddd5cb;border-radius:9px;padding:10px;background:white;line-height:1.5;overflow-wrap:anywhere}.pv-source-text:empty:before{content:attr(data-placeholder);color:#999}.pv-source-text a{color:#c65b35;text-decoration:underline}.pv-source-row button{white-space:nowrap}.pv-add-source{margin:8px 0}@media(max-width:640px){.pv-source-row{flex-wrap:wrap}.pv-source-text{flex-basis:100%}}';
    document.head.append(style);
  }
  let count = 0;
  const timer = setInterval(() => {
    if (typeof window.collect === 'function' && typeof window.fill === 'function' && $('#source')) {
      clearInterval(timer); init();
    } else if (++count > 200) clearInterval(timer);
  }, 50);
})();
