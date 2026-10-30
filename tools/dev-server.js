// Run the real site + admin locally against the pretend GitHub (nothing real is touched).
//   node tools/dev-server.js   ->  http://localhost:5270/admin/   password: dev-password-123
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { seed, ghHandler, state } = require('./mock-github');

const SITE = path.join(__dirname, '..', 'motionholic-site');
seed();
const gh = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x); ghHandler(req, res, Buffer.concat(c).toString()); })
  .listen(0, '127.0.0.1', start);

function start() {
  Object.assign(process.env, {
    ADMIN_PASSWORD: 'dev-password-123', SESSION_SECRET: crypto.randomBytes(24).toString('hex'),
    GITHUB_TOKEN: 'tok', GITHUB_API: `http://127.0.0.1:${gh.address().port}`, GITHUB_REPO: 'o/r',
  });
  const api = require('../motionholic-site/api/admin/[action].js');
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/admin/')) {
      const c = []; for await (const x of req) c.push(x);
      req.query = { action: url.pathname.slice('/api/admin/'.length) };
      req.body = c.length ? Buffer.concat(c).toString() : undefined;
      return api(req, res);
    }
    let p = decodeURIComponent(url.pathname);
    if (p === '/admin') { res.writeHead(302, { Location: '/admin/' }); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    // images published through the pretend GitHub are served from its memory
    const tree = state.trees.get(state.commits.get(state.head).tree);
    const mem = tree['motionholic-site' + p];
    if (mem && (p.startsWith('/assets/uploads/') || p.startsWith('/assets/playbooks/'))) { res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); return res.end(state.blobs.get(mem)); }
    if (p === '/' + 'index.html' && mem) { res.writeHead(200, { 'Content-Type': MIME['.html'] }); return res.end(state.blobs.get(mem)); }
    const file = path.normalize(path.join(SITE, p));
    if (!file.startsWith(SITE + path.sep) || p.startsWith('/api/')) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(file, (e, d) => { if (e) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  }).listen(5270, '127.0.0.1', () => console.log('Admin: http://localhost:5270/admin/  (password: dev-password-123)'));
}
