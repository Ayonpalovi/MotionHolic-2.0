// Saves the site by making a commit in the GitHub repo. Vercel then deploys it by itself.
// Several files go into ONE commit, so the site can never end up half-updated.
const API = () => process.env.GITHUB_API || 'https://api.github.com';
const REPO = () => process.env.GITHUB_REPO || 'Ayonpalovi/MotionHolic-2.0';
const BRANCH = () => process.env.GITHUB_BRANCH || 'main';
const SITE_DIR = () => (process.env.SITE_DIR === undefined ? 'motionholic-site' : process.env.SITE_DIR).replace(/^\/+|\/+$/g, '');
const at = (file) => (SITE_DIR() ? `${SITE_DIR()}/${file}` : file);

async function gh(path, opts = {}) {
  const res = await fetch(API() + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'motionholic-admin',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) {
    const err = new Error(data.message || `GitHub error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function readFile(file, ref) {
  const j = await gh(`/repos/${REPO()}/contents/${at(file).split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref || BRANCH())}`);
  return { sha: j.sha, text: Buffer.from(j.content, 'base64').toString('utf8') };
}

// files: [{ path, text } | { path, base64 }]  -> one commit on the branch
async function commitFiles(files, message) {
  const R = REPO(), B = BRANCH();
  const ref = await gh(`/repos/${R}/git/ref/heads/${B}`);
  const headSha = ref.object.sha;
  const head = await gh(`/repos/${R}/git/commits/${headSha}`);
  const entries = [];
  for (const f of files) {
    const blob = await gh(`/repos/${R}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify(f.base64 ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }),
    });
    entries.push({ path: at(f.path), mode: '100644', type: 'blob', sha: blob.sha, _file: f.path });
  }
  const tree = await gh(`/repos/${R}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.tree.sha, tree: entries.map(({ _file, ...e }) => e) }),
  });
  const commit = await gh(`/repos/${R}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
  });
  // not forced: if someone else committed in the meantime this fails instead of overwriting them
  await gh(`/repos/${R}/git/refs/heads/${B}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return { commit: commit.sha, shaOf: (file) => entries.find((e) => e._file === file).sha };
}

async function history(file, limit = 30) {
  const list = await gh(`/repos/${REPO()}/commits?sha=${encodeURIComponent(BRANCH())}&path=${encodeURIComponent(at(file))}&per_page=${limit}`);
  return list.map((c) => ({ sha: c.sha, time: c.commit.committer.date, message: c.commit.message.split('\n')[0] }));
}

module.exports = { readFile, commitFiles, history };
