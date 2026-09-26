(() => {
  const counters = [...document.querySelectorAll('[data-author-count]')];
  if (!counters.length) return;

  const publicationWord = (n) => {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return 'публикация';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'публикации';
    return 'публикаций';
  };

  const isPublishedNow = (post) => {
    if (!post) return false;
    if (post.status && post.status !== 'published') return false;
    const dateValue = post.publishedAt || post.publish_at || '';
    if (!dateValue) return true;
    const ts = Date.parse(dateValue);
    return Number.isNaN(ts) || ts <= Date.now();
  };

  fetch('/data/posts.json?v=20260926-authors2', { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`posts.json: ${response.status}`);
      return response.json();
    })
    .then((posts) => {
      const visiblePosts = Array.isArray(posts) ? posts.filter(isPublishedNow) : [];
      counters.forEach((counter) => {
        const author = (counter.dataset.authorCount || '').trim();
        const count = visiblePosts.filter((post) => {
          if ((post.author || '').trim() === author) return true;
          return Array.isArray(post.coauthors) && post.coauthors.some((name) => (name || '').trim() === author);
        }).length;
        counter.textContent = `${count} ${publicationWord(count)}`;
      });
    })
    .catch((error) => console.warn('Author publication counts were not refreshed:', error));
})();
