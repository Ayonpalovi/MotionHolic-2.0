// The admin panel's API. One file, one route per action: /api/admin/<action>
const { render } = require('../_lib/render');
const { validate, normalise, validateUploads, missingPlaybookFiles } = require('../_lib/content');
const auth = require('../_lib/auth');
const github = require('../_lib/github');

const MAX_BODY = 4 * 1024 * 1024; // Vercel allows 4.5 MB per request

const send = (res, code, data, extra = {}) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
};

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
    return req.body;
  }
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw Object.assign(new Error('Too large'), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const friendly = (e) => {
  if (e.status === 401 || e.status === 403) return 'The site could not be updated: the GitHub access key was refused. It may have expired.';
  if (e.status === 404) return 'The site could not be updated: GitHub could not find the website files.';
  if (e.status === 422 || e.status === 409) return 'The website changed while you were editing. Please try again.';
  return 'The site could not be updated right now. Please try again in a minute.';
};

const siteFiles = (content, uploads) => [
  { path: 'content/content.json', text: JSON.stringify(content, null, 2) + '\n' },
  { path: 'index.html', text: render(content) },
  ...Object.entries(uploads || {}).map(([path, base64]) => ({ path, base64 })),
];

module.exports = async (req, res) => {
  try {
    const action = String((req.query && req.query.action) || '');
    const method = req.method;
    const missing = auth.missingSetup();

    if (action === 'session' && method === 'GET') {
      return send(res, 200, { authed: auth.isAuthed(req), setupNeeded: missing });
    }

    // Writes must come from our own page (custom header), on top of SameSite=Strict cookies.
    if (method !== 'GET' && req.headers['x-admin'] !== '1') return send(res, 403, { error: 'Request not allowed' });

    if (action === 'login' && method === 'POST') {
      if (missing.length) return send(res, 503, { error: 'The admin is not switched on yet. Setup is unfinished.' });
      const { password } = await readBody(req);
      if (!auth.passwordOk(password)) { await wait(1500); return send(res, 401, { error: 'Wrong password' }); }
      return send(res, 200, { ok: true }, { 'Set-Cookie': auth.cookie(req, auth.makeToken(), 12 * 3600) });
    }
    if (action === 'logout' && method === 'POST') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': auth.cookie(req, '', 0) });
    }

    if (!auth.isAuthed(req)) return send(res, 401, { error: 'Please sign in' });

    if (action === 'content' && method === 'GET') {
      const f = await github.readFile('content/content.json');
      return send(res, 200, { content: JSON.parse(f.text), sha: f.sha });
    }

    if (action === 'preview' && method === 'POST') {
      const { content } = await readBody(req);
      const err = validate(content);
      if (err) return send(res, 400, { error: err });
      // <base> lets the preview find /css, /js and /assets when shown inside the admin page
      const html = render(normalise(content)).replace('<head>', '<head>\n  <base href="/">');
      return send(res, 200, { html });
    }

    if (action === 'save' && method === 'PUT') {
      const { content, baseSha, uploads } = await readBody(req);
      const err = validate(content) || validateUploads(uploads, content);
      if (err) return send(res, 400, { error: err });
      normalise(content);
      const current = await github.readFile('content/content.json');
      if (baseSha && current.sha !== baseSha) {
        return send(res, 409, { error: 'The website was changed somewhere else since you opened it. Reload this page to see the latest version, then make your change again.' });
      }
      // a playbook that is new in this save must come with its PDF and cover
      let before = new Set();
      try { before = new Set((JSON.parse(current.text).playbooks.items || []).map((p) => p.slug)); } catch { /* older content: treat all as new */ }
      const added = content.playbooks.items.filter((p) => !before.has(p.slug));
      if (added.length) {
        const existing = new Set((await github.listDir('assets/playbooks')).map((n) => `assets/playbooks/${n}`));
        const missing = missingPlaybookFiles(content, uploads, existing, before);
        if (missing) return send(res, 400, { error: missing });
      }
      const out = await github.commitFiles(siteFiles(content, uploads), 'Admin: update website content');
      return send(res, 200, { ok: true, sha: out.shaOf('content/content.json'), content });
    }

    if (action === 'history' && method === 'GET') {
      return send(res, 200, await github.history('content/content.json'));
    }

    if (action === 'restore' && method === 'POST') {
      const { sha } = await readBody(req);
      if (!/^[0-9a-f]{40}$/.test(String(sha))) return send(res, 400, { error: 'Bad version' });
      const old = await github.readFile('content/content.json', sha);
      const content = JSON.parse(old.text);
      if (!content.playbooks || !Array.isArray(content.playbooks.items)) { // versions from before playbooks were editable
        const now = JSON.parse((await github.readFile('content/content.json')).text);
        content.playbooks = { ...(content.playbooks || {}), eyebrow: now.playbooks.eyebrow, items: now.playbooks.items };
      }
      const err = validate(content);
      if (err) return send(res, 400, { error: err });
      normalise(content);
      const out = await github.commitFiles(siteFiles(content), `Admin: restore earlier version (${sha.slice(0, 7)})`);
      return send(res, 200, { ok: true, sha: out.shaOf('content/content.json'), content });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    if (e instanceof SyntaxError) return send(res, 400, { error: 'That request could not be read' });
    if (e.status === 413) return send(res, 413, { error: 'That is too much to send at once. Try fewer or smaller images.' });
    console.error('admin api error', e.status || '', e.message);
    return send(res, e.status === 404 ? 502 : 500, { error: friendly(e) });
  }
};
