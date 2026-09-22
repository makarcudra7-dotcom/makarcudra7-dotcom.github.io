const crypto = require('crypto');

const OWNER = 'makarcudra7-dotcom';
const REPO = 'makarcudra7-dotcom.github.io';
const BRANCH = 'main';
const ALLOWED_ORIGINS = new Set([
  'https://provkus-media.ru',
  'https://www.provkus-media.ru'
]);

function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

function allowedPath(path) {
  return path === 'data/posts.json' ||
    /^articles\/[a-z0-9-]+\.html$/.test(path) ||
    /^assets\/uploads\/[A-Za-z0-9._-]+$/.test(path);
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(res, 403, { error: 'Origin not allowed' });
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ProVkus-Admin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const expected = process.env.PROVKUS_ADMIN_HASH || '';
  const provided = req.headers['x-provkus-admin'] || '';
  if (!safeEqual(expected, provided)) return json(res, 401, { error: 'Unauthorized' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
  }

  if (body.action === 'ping') return json(res, 200, { ok: true, repo: `${OWNER}/${REPO}` });

  const path = String(body.path || '').replace(/^\/+/, '');
  if (!allowedPath(path)) return json(res, 400, { error: 'Path is not allowed' });
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');

  try {
    if (body.action === 'get') {
      const r = await github(`${encodedPath}?ref=${encodeURIComponent(BRANCH)}`);
      if (r.status === 404) return json(res, 200, { file: null });
      const data = await r.json();
      if (!r.ok) return json(res, r.status, { error: data.message || `GitHub ${r.status}` });
      return json(res, 200, { file: data });
    }

    if (body.action === 'put') {
      const encoding = body.encoding === 'base64' ? 'base64' : 'utf-8';
      const rawContent = String(body.content || '');
      const content = encoding === 'base64' ? rawContent : Buffer.from(rawContent, 'utf8').toString('base64');
      const current = await github(`${encodedPath}?ref=${encodeURIComponent(BRANCH)}`);
      let sha;
      if (current.ok) sha = (await current.json()).sha;
      else if (current.status !== 404) {
        const err = await current.json().catch(() => ({}));
        return json(res, current.status, { error: err.message || `GitHub ${current.status}` });
      }
      const payload = {
        message: String(body.message || 'Publish from ProVkus CMS'),
        branch: BRANCH,
        content
      };
      if (sha) payload.sha = sha;
      const r = await github(encodedPath, { method: 'PUT', body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return json(res, r.status, { error: data.message || `GitHub ${r.status}` });
      return json(res, 200, { result: data });
    }

    if (body.action === 'delete') {
      const current = await github(`${encodedPath}?ref=${encodeURIComponent(BRANCH)}`);
      if (current.status === 404) return json(res, 200, { result: null, deleted: false });
      const currentData = await current.json().catch(() => ({}));
      if (!current.ok) return json(res, current.status, { error: currentData.message || `GitHub ${current.status}` });
      const payload = {
        message: String(body.message || 'Delete from ProVkus CMS'),
        branch: BRANCH,
        sha: currentData.sha
      };
      const r = await github(encodedPath, { method: 'DELETE', body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return json(res, r.status, { error: data.message || `GitHub ${r.status}` });
      return json(res, 200, { result: data, deleted: true });
    }

    return json(res, 400, { error: 'Unknown action' });
  } catch (error) {
    console.error('ProVkus publish API:', error);
    return json(res, 500, { error: 'Publishing server error' });
  }
};
