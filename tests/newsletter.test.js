const assert = require('node:assert/strict');
const {test} = require('node:test');
const {queueArticle, renderGroupFeed} = require('../lib/newsletter');

test('the three-article feed appears only when the issue is full and rejects a fourth article', () => {
  const now = new Date('2026-09-23T12:00:00Z');
  const posts = Array.from({length: 4}, (_, index) => ({
    slug: `article-${index}`,
    headline: `Статья ${index}`,
    newsletterGroup: 3,
    publishedAt: '2026-09-22T10:00:00Z'
  }));
  let pushes = [];
  for (let index = 0; index < 3; index++) {
    const result = queueArticle(posts, pushes, posts[index].slug, now);
    pushes = result.pushes;
    assert.equal(result.ready, index === 2);
    assert.equal(renderGroupFeed(3, posts, pushes, now).includes('Статья 0'), index === 2);
  }
  assert.throws(() => queueArticle(posts, pushes, 'article-3', now), /Лимит рассылки превышен/);
  assert.equal(renderGroupFeed(1, posts, pushes, now).includes('Статья 0'), false);
});

test('unassigned and scheduled articles cannot enter a newsletter', () => {
  assert.throws(() => queueArticle([{slug:'a'}], [], 'a'), /выберите|укажите/);
  assert.throws(() => queueArticle([{slug:'b',newsletterGroup:1,publishedAt:'2026-09-24T00:00:00Z'}], [], 'b', new Date('2026-09-23T12:00:00Z')), /до публикации/);
});
