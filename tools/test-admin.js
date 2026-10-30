// Runs the admin API against a pretend GitHub (in memory), so nothing real is touched.
//   node tools/test-admin.js
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const gitHash = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

const { seed, ghHandler, state } = require('./mock-github');
const { blobs, trees, commits } = state;
const headSha = () => state.head;

/* ---------- run the real handler the way Vercel would ---------- */
function listen(handler) {
  return new Promise((ok) => {
    const s = http.createServer(async (req, res) => {
      const chunks = []; for await (const c of req) chunks.push(c);
      handler(req, res, Buffer.concat(chunks).toString('utf8'));
    }).listen(0, '127.0.0.1', () => ok(s));
  });
}

(async () => {
  seed();
  const gh = await listen(ghHandler);
  Object.assign(process.env, {
    ADMIN_PASSWORD: 'correct horse battery', SESSION_SECRET: crypto.randomBytes(24).toString('hex'),
    GITHUB_TOKEN: 'tok', GITHUB_API: `http://127.0.0.1:${gh.address().port}`, GITHUB_REPO: 'o/r',
  });
  const api = require(path.join(ROOT, 'motionholic-site/api/admin/[action].js'));
  const app = await listen((req, res, body) => {
    const url = new URL(req.url, 'http://x');
    req.query = { action: url.pathname.replace('/api/admin/', '') };
    req.body = body ? body : undefined;                      // Vercel hands over parsed JSON; the handler accepts both
    api(req, res);
  });
  const base = `http://127.0.0.1:${app.address().port}/api/admin/`;

  let cookie = '';
  const call = async (action, { method = 'GET', body, headers = {}, auth = true } = {}) => {
    const r = await fetch(base + action, {
      method, body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-Admin': '1' } : {}), ...(auth && cookie ? { Cookie: cookie } : {}), ...headers },
    });
    const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, headers: r.headers };
  };

  let pass = 0, fail = 0;
  const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok  ', name); } catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message); } };
  const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
  const ok = (v, msg) => { if (!v) throw new Error(msg || 'not true'); };
  const file = (f) => blobs.get(trees.get(commits.get(state.head).tree)['motionholic-site/' + f]);

  await t('session works signed out, shows nothing secret', async () => { const r = await call('session', { auth: false }); eq(r.status, 200); eq(r.data.authed, false); });
  await t('content refused when signed out', async () => eq((await call('content', { auth: false })).status, 401));
  await t('write refused without the X-Admin header', async () => eq((await call('login', { method: 'POST', body: { password: 'x' }, headers: { 'X-Admin': '' } })).status, 403));
  await t('wrong password rejected', async () => eq((await call('login', { method: 'POST', body: { password: 'nope' } })).status, 401));
  await t('right password signs in, cookie is HttpOnly + Strict', async () => {
    const r = await call('login', { method: 'POST', body: { password: process.env.ADMIN_PASSWORD } });
    eq(r.status, 200);
    const c = r.headers.get('set-cookie'); ok(/HttpOnly/.test(c) && /SameSite=Strict/.test(c), c);
    cookie = c.split(';')[0];
  });
  await t('a tampered cookie is rejected', async () => {
    const saved = cookie; cookie = cookie.slice(0, -3) + 'abc';
    eq((await call('content')).status, 401); cookie = saved;
  });

  let content, sha;
  await t('content loads from GitHub', async () => { const r = await call('content'); eq(r.status, 200); content = r.data.content; sha = r.data.sha; eq(content.pricing.plans[1].price, '$695'); });
  await t('preview renders unsaved edits', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.hero.line1 = 'Preview <b>test</b>';
    const r = await call('preview', { method: 'POST', body: { content: c } });
    eq(r.status, 200); ok(r.data.html.includes('Preview &lt;b&gt;test&lt;/b&gt;'), 'text should be escaped'); ok(r.data.html.includes('<base href="/">'));
  });
  await t('preview rejects broken content', async () => eq((await call('preview', { method: 'POST', body: { content: { settings: {} } } })).status, 400));

  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), crypto.randomBytes(200)]).toString('base64');
  await t('save: price change + new image become ONE commit with page, content and image', async () => {
    const before = commits.size;
    const c = JSON.parse(JSON.stringify(content));
    c.pricing.plans[1].price = '$795'; c.about.image = 'assets/uploads/new-photo.png';
    const r = await call('save', { method: 'PUT', body: { content: c, baseSha: sha, uploads: { 'assets/uploads/new-photo.png': png } } });
    eq(r.status, 200, JSON.stringify(r.data)); eq(commits.size, before + 1, 'exactly one commit'); sha = r.data.sha;
    ok(file('index.html').toString().includes('<strong>$795</strong>'), 'page has new price');
    ok(!file('index.html').toString().includes('<strong>$695</strong>'));
    eq(JSON.parse(file('content/content.json')).pricing.plans[1].price, '$795');
    ok(file('assets/uploads/new-photo.png').length > 100, 'image committed');
    const ld = JSON.parse(file('index.html').toString().match(/ld\+json">([\s\S]*?)<\/script>/)[1]);
    eq(ld['@graph'][0].makesOffer[1].price, 795, 'Google data updated too');
    content = r.data.content;
  });
  await t('save with a stale version is refused (nothing overwritten)', async () => {
    const before = commits.size;
    const r = await call('save', { method: 'PUT', body: { content, baseSha: 'f'.repeat(40), uploads: {} } });
    eq(r.status, 409); eq(commits.size, before);
  });
  await t('fake image (wrong bytes) refused', async () => {
    const r = await call('save', { method: 'PUT', body: { content, baseSha: sha, uploads: { 'assets/uploads/evil.png': Buffer.from('<script>alert(1)</script>').toString('base64') } } });
    eq(r.status, 400);
  });
  await t('upload path outside assets/uploads refused', async () => {
    for (const bad of ['../index.html', 'assets/uploads/../../api/x.png', 'index.html', 'api/admin/x.png']) {
      const r = await call('save', { method: 'PUT', body: { content, baseSha: sha, uploads: { [bad]: png } } }); eq(r.status, 400, bad);
    }
  });
  await t('javascript: link refused', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.settings.calendly = 'javascript:alert(1)';
    eq((await call('save', { method: 'PUT', body: { content: c, baseSha: sha } })).status, 400);
  });
  await t('odd image path in content refused', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.about.image = 'assets/../../etc/passwd.png';
    eq((await call('save', { method: 'PUT', body: { content: c, baseSha: sha } })).status, 400);
  });
  await t('script text in a field is escaped on the page', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.faq.items[0].a = '"><script>alert(1)</script>';
    const r = await call('save', { method: 'PUT', body: { content: c, baseSha: sha } }); eq(r.status, 200); sha = r.data.sha;
    const html = file('index.html').toString();
    ok(!html.includes('<script>alert(1)</script>'), 'raw script tag must not appear');
    const ld = html.match(/ld\+json">([\s\S]*?)<\/script>/)[1]; ok(!ld.includes('<script'), 'JSON-LD cannot be broken out of');
    content = r.data.content;
  });
  await t('typed {{placeholders}} are not interpreted', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.hero.line2 = 'Hello {{seo.title}} {{@jsonld}}';
    const r = await call('save', { method: 'PUT', body: { content: c, baseSha: sha } }); eq(r.status, 200); sha = r.data.sha; content = r.data.content;
    ok(file('index.html').toString().includes('Hello {{seo.title}} {{@jsonld}}'));
  });
  const pdf = Buffer.from('%PDF-1.4 test playbook ' + 'x'.repeat(300)).toString('base64');
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(100)]).toString('base64');
  const withPlaybook = (extra) => { const c = JSON.parse(JSON.stringify(content)); c.playbooks.items.push({ name: 'Photographer', slug: 'photographer', pages: 28, rev: '', ...extra }); return c; };
  await t('playbooks: the three existing ones render as chips + covers', async () => {
    const html = file('index.html').toString();
    eq((html.match(/<button type="button" class="pbx__chip/g) || []).length, 3); eq((html.match(/<img class="pbx__cover/g) || []).length, 3); ok(html.includes('Free download &middot;') || html.includes('Free download · 3 niches'), 'eyebrow shows 3');
  });
  await t('playbooks: a new one WITHOUT files is refused with a clear message', async () => {
    const r = await call('save', { method: 'PUT', body: { content: withPlaybook(), baseSha: sha, uploads: {} } });
    eq(r.status, 400); ok(/Photographer.*PDF and cover image/.test(r.data.error), r.data.error);
  });
  await t('playbooks: only a PDF (no cover) is still refused', async () => {
    const r = await call('save', { method: 'PUT', body: { content: withPlaybook(), baseSha: sha, uploads: { 'assets/playbooks/motionholic-photographer-playbook.pdf': pdf } } });
    eq(r.status, 400); ok(/cover image/.test(r.data.error) && !/PDF/.test(r.data.error), r.data.error);
  });
  await t('playbooks: fake PDF refused', async () => {
    const r = await call('save', { method: 'PUT', body: { content: withPlaybook(), baseSha: sha, uploads: { 'assets/playbooks/motionholic-photographer-playbook.pdf': Buffer.from('not a pdf').toString('base64'), 'assets/playbooks/photographer-cover.jpg': jpg } } });
    eq(r.status, 400); ok(/PDF/.test(r.data.error));
  });
  await t('playbooks: files for a playbook that is not in the list are refused', async () => {
    const r = await call('save', { method: 'PUT', body: { content, baseSha: sha, uploads: { 'assets/playbooks/motionholic-ghost-playbook.pdf': pdf } } });
    eq(r.status, 400);
  });
  await t('playbooks: bad file names / page counts / duplicates refused', async () => {
    for (const bad of [{ slug: '../x' }, { slug: 'Has Caps' }, { pages: 0 }, { pages: 'abc' }, { name: '' }, { slug: 'business-coach' }]) {
      const r = await call('save', { method: 'PUT', body: { content: withPlaybook(bad), baseSha: sha, uploads: {} } }); eq(r.status, 400, JSON.stringify(bad) + ' ' + JSON.stringify(r.data));
    }
  });
  await t('playbooks: new one WITH pdf + cover goes live in ONE commit and the page shows it', async () => {
    const before = commits.size;
    const r = await call('save', { method: 'PUT', body: { content: withPlaybook(), baseSha: sha, uploads: { 'assets/playbooks/motionholic-photographer-playbook.pdf': pdf, 'assets/playbooks/photographer-cover.jpg': jpg } } });
    eq(r.status, 200, JSON.stringify(r.data)); eq(commits.size, before + 1); sha = r.data.sha; content = r.data.content;
    const html = file('index.html').toString();
    ok(html.includes('data-slug="photographer" data-name="Photographer" data-pages="28"'), 'chip');
    ok(html.includes('src="assets/playbooks/photographer-cover.jpg"'), 'cover');
    ok(html.includes('Free download &middot; 4 niches') || html.includes('Free download · 4 niches'), 'eyebrow counts 4');
    ok(file('assets/playbooks/motionholic-photographer-playbook.pdf').toString().startsWith('%PDF-'), 'pdf committed');
    eq(file('assets/playbooks/photographer-cover.jpg').length > 50, true);
    ok(!/class="pbx__cover pbx__cover--(front|right|left)" data-slug="photographer"/.test(html), 'fourth cover waits off-stage');
  });
  await t('playbooks: a playbook whose files are already on the site needs no upload', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.playbooks.items.push({ name: 'UGC Creator', slug: 'ugc-creator', pages: 30, rev: '' });
    const r = await call('save', { method: 'PUT', body: { content: c, baseSha: sha, uploads: {} } });
    eq(r.status, 200, JSON.stringify(r.data)); sha = r.data.sha; content = r.data.content;
    ok(file('index.html').toString().includes('data-slug="ugc-creator"'));
  });
  await t('playbooks: replacing a file with a new version tag adds ?v= to the links', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.playbooks.items[0].rev = 'k3x9';
    const r = await call('save', { method: 'PUT', body: { content: c, baseSha: sha, uploads: { 'assets/playbooks/motionholic-business-coach-playbook.pdf': pdf } } });
    eq(r.status, 200, JSON.stringify(r.data)); sha = r.data.sha; content = r.data.content;
    const html = file('index.html').toString();
    ok(html.includes('motionholic-business-coach-playbook.pdf?v=k3x9') && html.includes('business-coach-cover.jpg?v=k3x9'), 'versioned links');
  });
  await t('playbooks: deleting one removes its chip, cover and eyebrow count follows', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.playbooks.items = c.playbooks.items.filter((p) => p.slug !== 'ugc-creator' && p.slug !== 'photographer');
    const r = await call('save', { method: 'PUT', body: { content: c, baseSha: sha } }); eq(r.status, 200); sha = r.data.sha; content = r.data.content;
    const html = file('index.html').toString();
    ok(!html.includes('data-slug="photographer"') && !html.includes('data-slug="ugc-creator"')); ok(/Free download (&middot;|·) 3 niches/.test(html));
  });
  await t('playbooks: the last one cannot be deleted (needs at least 1)', async () => {
    const c = JSON.parse(JSON.stringify(content)); c.playbooks.items = [];
    eq((await call('save', { method: 'PUT', body: { content: c, baseSha: sha } })).status, 400);
  });
  await t('history lists versions newest first', async () => {
    const r = await call('history'); eq(r.status, 200); ok(r.data.length >= 4, 'length ' + r.data.length); ok(/^Admin:/.test(r.data[0].message));
  });
  await t('restore puts an older version live as a NEW commit', async () => {
    const h = (await call('history')).data; const old = h[h.length - 1]; // the seed version
    const before = commits.size;
    const r = await call('restore', { method: 'POST', body: { sha: old.sha } });
    eq(r.status, 200, JSON.stringify(r.data)); eq(commits.size, before + 1);
    ok(file('index.html').toString().includes('<strong>$695</strong>'), 'old price back');
  });
  await t('restore refuses a malformed id', async () => eq((await call('restore', { method: 'POST', body: { sha: '../../x' } })).status, 400));
  await t('GitHub key refused -> friendly message, no secrets leaked', async () => {
    const old = process.env.GITHUB_TOKEN; process.env.GITHUB_TOKEN = 'wrong';
    const r = await call('content'); process.env.GITHUB_TOKEN = old;
    eq(r.status, 500); ok(/access key/.test(r.data.error)); ok(!JSON.stringify(r.data).includes('Bearer'));
  });
  await t('signing out clears the cookie', async () => {
    const r = await call('logout', { method: 'POST' }); ok(/Max-Age=0/.test(r.headers.get('set-cookie')));
  });
  await t('login refused until setup is complete', async () => {
    const old = process.env.ADMIN_PASSWORD; process.env.ADMIN_PASSWORD = 'short';
    const r = await call('login', { method: 'POST', body: { password: 'short' } }); process.env.ADMIN_PASSWORD = old; eq(r.status, 503);
  });
  await t('changing the password signs existing sessions out', async () => {
    const r = await call('login', { method: 'POST', body: { password: process.env.ADMIN_PASSWORD } }); cookie = r.headers.get('set-cookie').split(';')[0];
    eq((await call('content')).status, 200);
    const old = process.env.ADMIN_PASSWORD; process.env.ADMIN_PASSWORD = 'a different long password'; const s = (await call('content')).status; process.env.ADMIN_PASSWORD = old; eq(s, 401);
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
