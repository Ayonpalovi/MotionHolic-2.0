// A tiny in-memory pretend GitHub, used by the tests and the local dev server.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const gitHash = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

const blobs = new Map(), trees = new Map(), commits = new Map();
let head = null;
const state = { get head() { return head; }, blobs, trees, commits };
const put = (buf) => { const s = gitHash(buf); blobs.set(s, buf); return s; };
function seed() {
  const files = {
    'motionholic-site/content/content.json': put(fs.readFileSync(path.join(ROOT, 'motionholic-site/content/content.json'))),
    'motionholic-site/assets/playbooks/motionholic-ugc-creator-playbook.pdf': put(Buffer.from('%PDF-1.4 ugc')),
    'motionholic-site/assets/playbooks/ugc-creator-cover.jpg': put(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])),
    'motionholic-site/index.html': put(execSync('git show HEAD:motionholic-site/index.html', { cwd: ROOT, maxBuffer: 1 << 26 })),
  };
  trees.set('t0', files);
  const SEED = sha1('seed');
  commits.set(SEED, { tree: 't0', parent: null, message: 'seed', date: '2026-10-01T00:00:00Z' });
  head = SEED;
}
function ghHandler(req, res, body) {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname.replace(/^\/repos\/o\/r/, '');
  const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (req.headers.authorization !== 'Bearer tok') return json(401, { message: 'Bad credentials' });
  let m;
  if ((m = p.match(/^\/contents\/(.+)$/)) && req.method === 'GET') {
    const ref = u.searchParams.get('ref');
    const c = commits.get(ref === 'main' ? head : ref);
    if (!c) return json(404, { message: 'No commit found for the ref' });
    const want = decodeURIComponent(m[1]);
    const tree = trees.get(c.tree);
    if (!tree[want]) {
      const names = [...new Set(Object.keys(tree).filter((k) => k.startsWith(want + '/')).map((k) => k.slice(want.length + 1).split('/')[0]))];
      if (names.length) return json(200, names.map((name) => ({ name, type: 'file' })));
    }
    const file = tree[want];
    if (!file) return json(404, { message: 'Not Found' });
    return json(200, { sha: file, content: blobs.get(file).toString('base64'), encoding: 'base64' });
  }
  if (p === '/git/ref/heads/main' && req.method === 'GET') return json(200, { object: { sha: head } });
  if ((m = p.match(/^\/git\/commits\/(\w+)$/)) && req.method === 'GET') return json(200, { sha: m[1], tree: { sha: commits.get(m[1]).tree } });
  if (p === '/git/blobs' && req.method === 'POST') {
    const b = JSON.parse(body);
    return json(201, { sha: put(Buffer.from(b.content, b.encoding === 'base64' ? 'base64' : 'utf8')) });
  }
  if (p === '/git/trees' && req.method === 'POST') {
    const b = JSON.parse(body);
    const files = { ...trees.get(b.base_tree) };
    b.tree.forEach((e) => { files[e.path] = e.sha; });
    const id = sha1(JSON.stringify(files)); trees.set(id, files);
    return json(201, { sha: id });
  }
  if (p === '/git/commits' && req.method === 'POST') {
    const b = JSON.parse(body);
    const id = sha1(JSON.stringify(b) + commits.size);
    commits.set(id, { tree: b.tree, parent: b.parents[0], message: b.message, date: new Date(Date.UTC(2026, 9, 2 + commits.size)).toISOString() });
    return json(201, { sha: id });
  }
  if (p === '/git/refs/heads/main' && req.method === 'PATCH') {
    const b = JSON.parse(body);
    if (commits.get(b.sha).parent !== head) return json(422, { message: 'Update is not a fast forward' });
    head = b.sha; return json(200, {});
  }
  if (p === '/commits' && req.method === 'GET') {
    const file = u.searchParams.get('path'); const out = []; let id = head;
    while (id) {
      const c = commits.get(id); const parent = c.parent && commits.get(c.parent);
      const cur = trees.get(c.tree)[file], prev = parent && trees.get(parent.tree)[file];
      if (cur && cur !== prev) out.push({ sha: id, commit: { message: c.message, committer: { date: c.date } } });
      id = c.parent;
    }
    return json(200, out);
  }
  return json(404, { message: 'Not Found: ' + p });
}


module.exports = { seed, ghHandler, state, put };
