const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_QUEUE = path.join(ROOT, '.github', 'scheduled-posts.json');
const REMOTE_HASH = path.join(ROOT, '.runtime-scheduler-remote.sha256');
const REMOTE_URL = 'https://raw.githubusercontent.com/makarcudra7-dotcom/makarcudra7-dotcom.github.io/main/.github/scheduled-posts.json';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function localQueueIsValid() {
  try {
    const value = JSON.parse(fs.readFileSync(LOCAL_QUEUE, 'utf8'));
    return Array.isArray(value);
  } catch {
    return false;
  }
}

(async () => {
  const response = await fetch(`${REMOTE_URL}?pv=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`queue fetch failed: HTTP ${response.status}`);

  const text = await response.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('remote scheduled queue is not an array');

  const hash = sha256(text);
  let previous = '';
  try { previous = fs.readFileSync(REMOTE_HASH, 'utf8').trim(); } catch {}

  if (hash === previous && localQueueIsValid()) process.exit(0);

  fs.mkdirSync(path.dirname(LOCAL_QUEUE), { recursive: true });
  fs.writeFileSync(LOCAL_QUEUE, text.endsWith('\n') ? text : `${text}\n`);
  fs.writeFileSync(REMOTE_HASH, `${hash}\n`);
  console.log(`[runtime-scheduler] queue refreshed from GitHub: ${parsed.length} item(s)`);
})().catch(error => {
  console.error(`[runtime-scheduler] queue refresh failed: ${error.message || error}`);
  process.exit(1);
});
