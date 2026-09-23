(() => {
  const STUDIO_URL = 'https://dzen.ru/profile/editor/create';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const excluded = '.note, .sources, .article-sources, .author-opinion, .article-share, .quiz-card, .related-stories';
  let cover = null;
  let previewCoverUrl = '';

  function flashMessage(message) {
    if (typeof flash === 'function') return flash(message);
    const element = document.getElementById('flash');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 3000);
  }

  async function copyText(value) {
    try { await navigator.clipboard.writeText(value); return true } catch {}
    const input = document.createElement('textarea');
    input.value = value;
    input.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
  }

  function articleBlocks(root) {
    if (!root) return [];
    const blocks = [];
    function visit(node) {
      if (node.nodeType !== 1 || node.matches(excluded)) return;
      if (node.matches('.pv-quiz')) {
        const questions = [...node.querySelectorAll('.pv-quiz-question')];
        if (questions.length) {
          blocks.push('Проверьте себя: выберите вариант ответа, затем сравните с ключом внизу.');
          questions.forEach((question, index) => {
            const title = clean(question.querySelector('legend')?.textContent).replace(/^\d+\.\s*/, '');
            const options = [...question.querySelectorAll('.pv-quiz-option')].map(option => clean(option.textContent));
            blocks.push(`${index + 1}. ${title}\n${options.join('\n')}`);
          });
          blocks.push('Ответы:\n' + questions.map((question, index) => {
            const answer = question.querySelectorAll('.pv-quiz-option')[Number(question.dataset.correct)];
            return `${index + 1}. ${clean(answer?.textContent || question.dataset.explanation)}`;
          }).join('\n'));
        }
        return;
      }
      const tag = node.tagName;
      if (tag === 'FIGURE' || tag === 'IMG' || tag === 'SCRIPT') return;
      if (tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'P' || tag === 'BLOCKQUOTE') {
        const value = clean(node.textContent);
        if (value && !['Начните писать материал…', 'Текст статьи.', 'Подзаголовок'].includes(value)) blocks.push(value);
        return;
      }
      if (tag === 'UL' || tag === 'OL') {
        const lines = [...node.children].filter(item => item.tagName === 'LI').map((item, index) =>
          `${tag === 'OL' ? `${index + 1}.` : '•'} ${clean(item.textContent)}`
        ).filter(value => value.length > 3);
        if (lines.length) blocks.push(lines.join('\n'));
        return;
      }
      const nested = [...node.children].some(child => /^(P|DIV|H2|H3|H4|UL|OL|BLOCKQUOTE|SECTION)$/.test(child.tagName));
      if (!nested && (tag === 'DIV' || tag === 'SECTION')) {
        const value = clean(node.textContent);
        if (value) blocks.push(value);
        return;
      }
      [...node.children].forEach(visit);
    }
    [...root.children].forEach(visit);
    return blocks.filter((value, index) => index === 0 || value !== blocks[index - 1]);
  }

  function sourceLines(root) {
    if (!root) return [];
    return [...root.querySelectorAll('.note, .sources, .article-sources')].flatMap(note => {
      const links = [...note.querySelectorAll('a[href]')].map(link => {
        const label = clean(link.textContent);
        return `${label || 'Источник'} — ${link.href}`;
      });
      return links.length ? links : [clean(note.textContent).replace(/^Источники?:\s*/i, '')].filter(Boolean);
    });
  }

  function editedSources() {
    const raw = document.getElementById('source')?.value?.trim();
    if (!raw) return [];
    const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, 'text/html');
    const links = [...doc.querySelectorAll('a[href]')].map(a => `${clean(a.textContent) || 'Источник'} — ${a.href}`);
    return links.length ? links : [clean(doc.body.textContent)];
  }

  function fullArticle(data) {
    if (!data.blocks.length) throw new Error('В статье пока нет текста');
    const content = data.blocks.join('\n\n');
    const sources = data.sources.length ? `\n\nИсточники:\n${data.sources.join('\n')}` : '';
    const byline = data.author ? `\n\nАвтор: ${data.author}, ProVkus` : '';
    const site = data.url ? `\n\nИсходный материал на ProVkus: ${data.url}` : '';
    return content + sources + byline + site;
  }

  function modalElement() {
    let modal = document.getElementById('dzenModal');
    if (modal) return modal;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'assets/admin-dzen.css?v=20260923-article1';
    document.head.appendChild(stylesheet);
    modal = document.createElement('div');
    modal.id = 'dzenModal';
    modal.className = 'dzen-overlay';
    modal.hidden = true;
    modal.innerHTML = `<div class="dzen-card" role="dialog" aria-modal="true" aria-labelledby="dzenHeading">
      <div class="dzen-head"><h2 id="dzenHeading">Статья для Дзена</h2><button type="button" class="dzen-mini secondary" data-dzen-close aria-label="Закрыть">✕</button></div>
      <p class="dzen-note">Полный черновик на основе статьи ProVkus. Проверьте текст и при необходимости отредактируйте его перед публикацией.</p>
      <label for="dzenTitle">Заголовок</label><input id="dzenTitle" maxlength="140">
      <label for="dzenText">Текст статьи</label><textarea id="dzenText" spellcheck="true"></textarea>
      <div class="dzen-cover" id="dzenCover" hidden><img id="dzenCoverImage" alt="Фото обложки статьи"><div><strong>Фото обложки</strong><p class="dzen-note">Загрузите это фото в редактор Дзена.</p><button type="button" class="dzen-mini secondary" id="dzenDownloadImage">Скачать фото</button></div></div>
      <div class="dzen-actions"><button type="button" class="dzen-mini secondary" id="dzenCopyTitle">Копировать заголовок</button><button type="button" class="dzen-mini secondary" id="dzenCopyText">Копировать текст</button><button type="button" class="dzen-mini" id="dzenOpenStudio">Открыть Дзен-студию ↗</button></div>
      <p class="dzen-note">Публикация завершается в авторизованной Дзен-студии. Админка готовит черновик и фото, но не отправляет статью автоматически.</p>
    </div>`;
    document.body.appendChild(modal);
    const close = () => {
      modal.hidden = true; cover = null;
      if (previewCoverUrl) { URL.revokeObjectURL(previewCoverUrl); previewCoverUrl = '' }
    };
    modal.querySelector('[data-dzen-close]').onclick = close;
    modal.addEventListener('click', event => { if (event.target === modal) close() });
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') close() });
    modal.querySelector('#dzenCopyTitle').onclick = async () =>
      flashMessage(await copyText(modal.querySelector('#dzenTitle').value) ? 'Заголовок скопирован' : 'Не удалось скопировать заголовок');
    modal.querySelector('#dzenCopyText').onclick = async () =>
      flashMessage(await copyText(modal.querySelector('#dzenText').value) ? 'Текст скопирован' : 'Не удалось скопировать текст');
    modal.querySelector('#dzenOpenStudio').onclick = () => window.open(STUDIO_URL, '_blank', 'noopener');
    modal.querySelector('#dzenDownloadImage').onclick = downloadCover;
    return modal;
  }

  async function downloadCover() {
    if (!cover) return;
    try {
      const url = cover.file ? URL.createObjectURL(cover.file) : URL.createObjectURL(await (async () => {
        const response = await fetch(cover.url);
        if (!response.ok) throw new Error('Фото недоступно');
        return response.blob();
      })());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cover.slug || 'provkus-cover'}.${cover.file?.name.split('.').pop() || 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      flashMessage('Фото загружено');
    } catch { flashMessage('Не удалось скачать фото. Проверьте адрес изображения.') }
  }

  function openDraft(data) {
    const text = fullArticle(data);
    const modal = modalElement();
    modal.querySelector('#dzenTitle').value = clean(data.title);
    modal.querySelector('#dzenText').value = text;
    cover = data.imageFile || data.imageUrl ? {file:data.imageFile, url:data.imageUrl, slug:data.slug} : null;
    const coverBox = modal.querySelector('#dzenCover');
    coverBox.hidden = !cover;
    if (previewCoverUrl) { URL.revokeObjectURL(previewCoverUrl); previewCoverUrl = '' }
    if (cover) {
      previewCoverUrl = cover.file ? URL.createObjectURL(cover.file) : '';
      modal.querySelector('#dzenCoverImage').src = previewCoverUrl || cover.url;
    }
    modal.hidden = false;
    modal.querySelector('#dzenTitle').focus();
  }

  function currentArticle() {
    const slug = clean(document.getElementById('slug')?.value);
    const canonical = clean(document.getElementById('canonical')?.value);
    const url = canonical || (slug ? `https://provkus-media.ru/articles/${slug}.html` : '');
    const editor = document.getElementById('richEditor');
    const imageFile = document.getElementById('imageFile')?.files?.[0];
    const typed = clean(document.getElementById('image')?.value || document.getElementById('ogImage')?.value);
    return {
      title:clean(document.getElementById('headline')?.value),url,slug,
      blocks:articleBlocks(editor),sources:[...sourceLines(editor), ...editedSources()],
      author:clean(document.getElementById('author')?.value),imageFile,
      imageUrl:typed ? new URL(typed, location.href).href : ''
    };
  }

  async function publishedArticle(url) {
    const response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw new Error('Не удалось загрузить статью');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const body = doc.querySelector('.article-body');
    if (!body) throw new Error('Не найден текст статьи');
    const image = doc.querySelector('.article-cover')?.getAttribute('src') || doc.querySelector('meta[property="og:image"]')?.content;
    return {
      title:clean(doc.querySelector('h1')?.textContent),url,
      slug:url.split('/').pop()?.replace(/\.html(?:\?.*)?$/, ''),
      blocks:articleBlocks(body),sources:sourceLines(body),
      author:clean(doc.querySelector('.article-author strong')?.textContent),
      imageUrl:image ? new URL(image, url).href : ''
    };
  }

  const actions = document.querySelector('.top .actions');
  if (actions && !document.getElementById('dzenPublishBtn')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn soft';
    button.id = 'dzenPublishBtn';
    button.textContent = 'Подготовить для Дзена ↗';
    button.onclick = () => {
      try {
        const data = currentArticle();
        if (!data.title) throw new Error('Сначала заполните заголовок');
        openDraft(data);
      } catch (error) { flashMessage(error.message) }
    };
    actions.appendChild(button);
  }

  function addPostButtons() {
    const table = document.querySelector('#publications table');
    if (!table) return;
    const head = table.querySelector('thead tr');
    if (head && !head.querySelector('[data-dzen-th]')) {
      const th = document.createElement('th');
      th.dataset.dzenTh = '1';
      th.textContent = 'Дзен';
      head.appendChild(th);
    }
    if (head && table.querySelector('#postsTable .row-actions') && !head.querySelector('[data-dzen-actions-th]')) {
      const th = document.createElement('th');
      th.dataset.dzenActionsTh = '1';
      th.textContent = 'Действия';
      head.appendChild(th);
    }
    table.querySelectorAll('#postsTable tr').forEach(row => {
      if (row.dataset.dzenReady || row.children.length < 2) return;
      row.dataset.dzenReady = '1';
      if (row.querySelector('td[colspan]')) { row.querySelector('td').colSpan = head?.children.length || 6; return }
      const url = row.querySelector('a[href]')?.href;
      if (!url) return;
      const cell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dzen-mini secondary';
      button.textContent = 'Статья + фото';
      button.onclick = async () => {
        button.disabled = true;
        try { openDraft(await publishedArticle(url)) }
        catch (error) { flashMessage(error.message) }
        finally { button.disabled = false }
      };
      cell.appendChild(button);
      row.insertBefore(cell, row.querySelector('.row-actions'));
    });
  }

  const publications = document.querySelector('#publications .card-title');
  if (publications && !document.getElementById('dzenExportAll')) {
    const button = document.createElement('button');
    button.id = 'dzenExportAll';
    button.type = 'button';
    button.className = 'dzen-mini secondary';
    button.textContent = 'Скачать тексты для Дзена';
    button.style.marginLeft = '12px';
    button.style.verticalAlign = 'middle';
    publications.appendChild(button);
    button.onclick = async () => {
      const urls = [...document.querySelectorAll('#postsTable tr a[href]')].map(link => link.href);
      if (!urls.length) return flashMessage('Сначала загрузите список публикаций');
      button.disabled = true;
      try {
        const drafts = [];
        for (let i = 0; i < urls.length; i += 4) {
          const articles = await Promise.all(urls.slice(i, i + 4).map(publishedArticle));
          drafts.push(...articles.map(data => `${data.title}\nФото: ${data.imageUrl || 'не указано'}\n\n${fullArticle(data)}`));
          button.textContent = `Готовим статьи… ${drafts.length}/${urls.length}`;
        }
        const blob = new Blob([drafts.join('\n\n' + '═'.repeat(60) + '\n\n')], {type:'text/plain;charset=utf-8'});
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = 'provkus-dzen-articles.txt';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(anchor.href), 60000);
        flashMessage(`Подготовлены полные черновики: ${drafts.length}`);
      } catch (error) { flashMessage(`Не удалось скачать тексты: ${error.message}`) }
      finally { button.disabled = false; button.textContent = 'Скачать тексты для Дзена' }
    };
  }
  const postsTable = document.getElementById('postsTable');
  if (postsTable) { new MutationObserver(addPostButtons).observe(postsTable, {childList:true,subtree:true}); addPostButtons() }
})();
