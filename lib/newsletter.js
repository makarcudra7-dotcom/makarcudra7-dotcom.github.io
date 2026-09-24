const GROUPS = [1, 3, 5];
const SITE = 'https://provkus-media.ru';
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[char]));

function groupFor(post) {
  const group = Number(post?.newsletterGroup);
  return GROUPS.includes(group) ? group : 0;
}

function issueFor(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}

function queueArticle(posts, pushes, slug, now = new Date()) {
  const post = posts.find(item => item.slug === slug);
  if (!post) throw new Error('Материал не найден');
  if (Number.isFinite(Date.parse(post.publishedAt)) && Date.parse(post.publishedAt) > new Date(now).getTime()) {
    throw new Error('Запланированный материал нельзя отправить до публикации');
  }
  const group = groupFor(post);
  if (!group) throw new Error('Сначала укажите в материале подборку рассылки: 1, 3 или 5');
  const issue = issueFor(now);
  const existing = pushes.filter(item => item.issue === issue && Number(item.group) === group);
  if (existing.some(item => item.slug === slug)) throw new Error('Этот материал уже добавлен в подборку на сегодня');
  if (existing.length >= group) {
    const error = new Error(`Лимит рассылки превышен: в подборке на ${group} уже ${existing.length} материалов за сегодня`);
    error.status = 409;
    throw error;
  }
  const item = {id: `${group}-${issue}-${slug}`, slug, group, issue, sentAt: new Date(now).toISOString()};
  return {pushes: [item, ...pushes].slice(0, 150), group, issue, count: existing.length + 1, ready: existing.length + 1 === group};
}

function renderGroupFeed(group, posts, pushes, now = new Date()) {
  if (!GROUPS.includes(group)) throw new Error('Неизвестная подборка');
  const bySlug = new Map(posts.map(post => [post.slug, post]));
  const issues = new Map();
  for (const push of pushes) {
    if (Number(push.group) !== group || !push.issue) continue;
    if (Date.parse(push.sentAt) < now.getTime() - 45 * 86400000) continue;
    const entries = issues.get(push.issue) || [];
    entries.push(push);
    issues.set(push.issue, entries);
  }
  const entries = [...issues].filter(([, items]) => items.length === group).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  const items = entries.map(([issue, selected]) => {
    const materials = selected.map(item => bySlug.get(item.slug)).filter(Boolean);
    if (materials.length !== group) return '';
    const link = materials[0].url || `${SITE}/articles/${materials[0].slug}.html`;
    const description = materials.map(post => `${post.headline} — ${post.url || `${SITE}/articles/${post.slug}.html`}`).join('\n');
    const pubDate = new Date(Math.max(...selected.map(item => Date.parse(item.sentAt) || 0))).toUTCString();
    return `  <item><title>${escapeXml(`ProVkus: ${group} материалов — ${issue}`)}</title><link>${escapeXml(link)}</link><guid isPermaLink="false">${escapeXml(`provkus-newsletter-${group}-${issue}`)}</guid><pubDate>${escapeXml(pubDate)}</pubDate><description>${escapeXml(description)}</description></item>`;
  }).filter(Boolean);
  const url = `${SITE}/newsletter-${group}.xml`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>ProVkus — подборка на ${group} материалов</title><link>${SITE}/</link><atom:link href="${url}" rel="self" type="application/rss+xml"/><description>Подборки ProVkus на ${group} материалов</description><language>ru</language>\n${items.join('\n')}\n</channel></rss>\n`;
}

module.exports = {GROUPS, groupFor, issueFor, queueArticle, renderGroupFeed};
