// Motionholic admin panel. Everything on screen is generated from the SECTIONS list below,
// so adding a new editable field is a one-line change.
(() => {
  'use strict';

  /* ---------- What can be edited ---------- */
  // field types: text, textarea, url, image, youtube, lines (one per line), list, heading
  const SECTIONS = [
    { group: 'Getting started', id: 'start', title: 'Start here', special: true },

    { group: 'Page sections (in page order)', id: 'hero', anchor: 'top', title: 'Top banner',
      lede: 'The first thing every visitor sees.',
      fields: [
        { key: 'line1', label: 'Headline, first line', type: 'text' },
        { key: 'line2', label: 'Headline, second line', type: 'text' },
        { key: 'sub', label: 'Line under the headline', type: 'textarea', rows: 2, hint: 'Typing a space, the letter I, and a space (like “views I 1,200+”) makes a small divider.' },
        { key: 'cta', label: 'Button text', type: 'text', hint: 'The button opens your booking link (set under “Links & contact”).' },
      ] },

    { id: 'showreel', anchor: 'showreel', title: 'Intro video',
      lede: 'The big video right under the banner.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'sub', label: 'Text under the heading', type: 'textarea', rows: 2 },
        { key: 'video', label: 'YouTube video', type: 'youtube', hint: 'Paste the YouTube link (or just the 11-character video code).' },
      ] },

    { id: 'about', anchor: 'why', title: 'About you',
      lede: 'The “Posting isn’t the problem” story with your photo.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'body', label: 'Story', type: 'textarea', rows: 15, hint: 'Leave a blank line between paragraphs to start a new one.' },
        { key: 'image', label: 'Photo', type: 'image' },
        { key: 'imageAlt', label: 'Describe the photo', type: 'text', hint: 'Short description for people using screen readers, and for Google.' },
      ] },

    { id: 'services', anchor: 'offers', title: 'Services',
      lede: 'The cards that explain what you edit.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'intro', label: 'Intro text', type: 'textarea', rows: 3 },
        { key: 'items', label: 'Services', type: 'list', addLabel: 'Add a service', itemName: 'service', min: 1, max: 8,
          itemTitle: (i) => i.title, blank: () => ({ title: 'New service', text: '' }),
          fields: [
            { key: 'title', label: 'Name', type: 'text' },
            { key: 'text', label: 'Description', type: 'textarea', rows: 4 },
          ] },
      ] },

    { id: 'work', anchor: 'work', title: 'Featured work',
      lede: 'The grid of example videos.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'videos', label: 'Videos', type: 'list', addLabel: 'Add a video', itemName: 'video', min: 0, max: 12,
          itemTitle: (v) => v.label, itemSub: (v) => v.video, blank: () => ({ video: '', label: 'New video' }),
          fields: [
            { key: 'video', label: 'YouTube video', type: 'youtube', hint: 'Paste the YouTube link (Shorts links work too).' },
            { key: 'label', label: 'Short label', type: 'text', hint: 'For example “Short form edit”. Used to describe the thumbnail for Google and screen readers.' },
          ] },
      ] },

    { id: 'process', anchor: 'process', title: 'How it works',
      lede: 'The numbered steps. Numbers (01, 02…) are added for you.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'steps', label: 'Steps', type: 'list', addLabel: 'Add a step', itemName: 'step', min: 2, max: 6,
          itemTitle: (s) => s.title, blank: () => ({ title: 'New step', text: '' }),
          fields: [
            { key: 'title', label: 'Step title', type: 'text' },
            { key: 'text', label: 'Description', type: 'textarea', rows: 3 },
          ] },
      ] },

    { id: 'numbers', anchor: 'numbers', title: 'Results & numbers',
      lede: 'The grid of results. The little animations (charts, bubbles, bars) stay as designed. You change the words and numbers.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { type: 'heading', label: 'Scrolling stats in the first card', hint: 'Six stats. The first three scroll down on the left, the last three scroll up on the right.' },
        { key: 'stats', label: 'Stats', type: 'list', fixed: true, itemName: 'stat',
          itemTitle: (s) => s.label, itemSub: (s) => s.value,
          fields: [
            { key: 'label', label: 'Label', type: 'text' },
            { key: 'value', label: 'Number', type: 'text', hint: 'For example “480 Million” or “94.2%”.' },
            { key: 'change', label: 'Growth shown in the green tag', type: 'text', hint: 'Type just the number, like 32.7%. The arrow is added for you.' },
          ] },
        { type: 'heading', label: 'Growth chart tag' },
        { key: 'chartTag', label: 'Number on the chart', type: 'text', hint: 'The “3.2×” badge on the growth chart.' },
        { type: 'heading', label: 'The 8 result cards', hint: 'Each card keeps its animation. Change its headline and sentence.' },
        { key: 'cards', label: 'Cards', type: 'list', fixed: true, itemName: 'card',
          itemTitle: (c) => c.title,
          fields: [
            { key: 'title', label: 'Headline', type: 'text' },
            { key: 'text', label: 'Sentence under it', type: 'textarea', rows: 3 },
          ] },
      ] },

    { id: 'pricing', anchor: 'pricing', title: 'Pricing',
      lede: 'Your plans. The plan with a badge (like “Main offer”) is highlighted.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'plans', label: 'Plans', type: 'list', addLabel: 'Add a plan', itemName: 'plan', min: 1, max: 3,
          itemTitle: (p) => p.name, itemSub: (p) => `${p.price} ${p.unit}`,
          blank: () => ({ name: 'New plan', tag: '', price: '$0', unit: 'per month', badge: '', inherits: '', features: [], value: '', button: 'Book a Call' }),
          fields: [
            { key: 'name', label: 'Plan name', type: 'text' },
            { key: 'tag', label: 'One-line pitch', type: 'text' },
            { row: [
              { key: 'price', label: 'Price', type: 'text', hint: 'Include the $ sign.' },
              { key: 'unit', label: 'Price note', type: 'text', hint: 'For example “per month”.' },
            ] },
            { key: 'badge', label: 'Highlight badge (optional)', type: 'text', hint: 'Fill in to highlight this plan, e.g. “Main offer”. Leave empty for no badge.' },
            { key: 'inherits', label: 'Line above the list (optional)', type: 'text', hint: 'For example “Everything in Starter, plus:”.' },
            { key: 'features', label: 'What’s included', type: 'lines', rows: 7, hint: 'One item per line.' },
            { key: 'value', label: 'Guarantee / extra note (optional)', type: 'textarea', rows: 2 },
            { key: 'button', label: 'Button text', type: 'text' },
          ] },
        { key: 'note', label: 'Note under the plans', type: 'text' },
      ] },

    { id: 'testimonials', anchor: 'testimonials', title: 'Client reviews',
      lede: 'What clients say about you.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'items', label: 'Reviews', type: 'list', addLabel: 'Add a review', itemName: 'review', min: 0, max: 8,
          itemTitle: (t) => t.name, itemSub: (t) => t.role, blank: () => ({ name: 'New client', role: '', photo: '', quote: '' }),
          fields: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'role', label: 'Role or company', type: 'text' },
            { key: 'photo', label: 'Photo (optional)', type: 'image', hint: 'Without a photo, their initials are shown.' },
            { key: 'quote', label: 'What they said', type: 'textarea', rows: 5, hint: 'No need to add quote marks, they are added for you.' },
          ] },
        { key: 'disclaimer', label: 'Small print under the reviews', type: 'textarea', rows: 3 },
      ] },

    { id: 'playbooks', anchor: 'playbooks', title: 'Free playbooks',
      lede: 'The free download box. Add a playbook to give visitors another niche to pick from. Each one needs a name, a page count, a cover image and the PDF.',
      fields: [
        { key: 'eyebrow', label: 'Small label above the heading', type: 'text', hint: 'Type {n} where the number of playbooks should go. It updates by itself as you add or remove playbooks.' },
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'sub', label: 'Text under the heading', type: 'textarea', rows: 3 },
        { key: 'items', label: 'Playbooks', type: 'list', addLabel: 'Add a playbook', itemName: 'playbook', min: 1, max: 10,
          itemTitle: (p) => p.name || 'New playbook', itemSub: (p) => (p.pages ? `${p.pages} pages` : ''),
          blank: () => ({ name: '', slug: '', pages: '', rev: '' }),
          fields: [
            { key: 'name', label: 'Name of the niche', type: 'text', hint: 'For example “Photographer”. It becomes the button text and the download button text. Type it before adding files.' },
            { key: 'pages', label: 'Number of pages in the PDF', type: 'text', hint: 'Just the number, like 28.' },
            { key: 'cover', type: 'pbfile', kind: 'cover', label: 'Cover image' },
            { key: 'pdf', type: 'pbfile', kind: 'pdf', label: 'The PDF people download' },
          ] },
      ] },

    { id: 'faq', anchor: 'faq', title: 'Questions & answers',
      lede: 'The FAQ. Google also reads these, so they are kept in sync for you automatically.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'items', label: 'Questions', type: 'list', addLabel: 'Add a question', itemName: 'question', min: 0, max: 20,
          itemTitle: (f) => f.q, blank: () => ({ q: 'New question?', a: '' }),
          fields: [
            { key: 'q', label: 'Question', type: 'text' },
            { key: 'a', label: 'Answer', type: 'textarea', rows: 4 },
          ] },
      ] },

    { id: 'cta', anchor: 'cta', title: 'Contact section',
      lede: 'The final “get in touch” area. The form itself is unchanged, so messages keep going where they go today.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text' },
        { key: 'sub', label: 'Text', type: 'textarea', rows: 4 },
      ] },

    { id: 'footer', anchor: 'bottom', title: 'Footer',
      lede: 'The bottom of every page.',
      fields: [
        { key: 'tagline', label: 'About line', type: 'textarea', rows: 3 },
        { key: 'disclaimer', label: 'Disclaimer', type: 'textarea', rows: 4 },
        { key: 'copyright', label: 'Copyright line', type: 'text' },
      ] },

    { group: 'Whole website', id: 'settings', title: 'Links & contact',
      lede: 'Used everywhere on the site, so you only change them once.',
      fields: [
        { key: 'calendly', label: 'Booking link', type: 'url', hint: 'Every “Book a Call” button goes here.' },
        { key: 'email', label: 'Email address', type: 'text' },
        { key: 'instagram', label: 'Instagram link', type: 'url' },
        { key: 'linkedin', label: 'LinkedIn link', type: 'url' },
      ] },

    { id: 'seo', title: 'Google & sharing',
      lede: 'What shows up in Google results and when someone shares your link.',
      fields: [
        { key: 'title', label: 'Page title', type: 'text', max: 65, hint: 'Shown as the blue headline in Google. Aim for 60 characters or fewer.' },
        { key: 'description', label: 'Description for Google', type: 'textarea', rows: 3, max: 160, hint: 'Shown under the title in Google. Aim for about 155 characters.' },
        { key: 'ogDescription', label: 'Description when shared', type: 'textarea', rows: 3, max: 200, hint: 'Shown when the link is shared on social media.' },
      ] },
  ];

  /* ---------- State ---------- */
  let content = null;
  let current = 'start';
  let dirty = false;
  const open = new Set();            // which list items are expanded
  let previewTimer = null;
  let saving = false;
  let baseSha = null;                 // version of the site this page was opened on
  const pending = {};                 // new images not published yet: path -> { base64, dataUrl }

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && n.append(c.nodeType ? c : document.createTextNode(c)));
    return n;
  };

  async function api(name, opts = {}) {
    const res = await fetch('/api/admin/' + name, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Admin': '1' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && name !== 'login') { showLogin(); throw new Error('Please sign in again'); }
    if (!res.ok) { const e = new Error(data.error || 'Something went wrong'); e.status = res.status; throw e; }
    return data;
  }

  /* ---------- Status / toast ---------- */
  function setStatus(kind, text) {
    const s = $('#status');
    s.className = 'top__status' + (kind ? ' is-' + kind : '');
    s.textContent = text;
  }
  function markDirty() {
    dirty = true;
    $('#btnSave').disabled = false;
    setStatus('dirty', 'Unpublished changes');
    clearTimeout(previewTimer);
    previewTimer = setTimeout(pushPreview, 600);
  }
  let toastTimer;
  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast is-on' + (isError ? ' is-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = 'toast'), isError ? 5000 : 2800);
  }

  /* ---------- Live preview ---------- */
  const frame = $('#frame');
  let previewAnchor = null;

  let previewSeq = 0;
  async function pushPreview() {
    const seq = ++previewSeq;
    try {
      const out = await api('preview', { method: 'POST', body: JSON.stringify({ content }) });
      if (seq === previewSeq) frame.srcdoc = out.html; // ignore out-of-date answers
    } catch (e) { if (e.status !== 401) setStatus('error', e.message); }
  }
  function reloadFrame() { pushPreview(); }
  function scrollFrame(anchor) {
    previewAnchor = anchor;
    const doc = frame.contentDocument;
    if (!doc || !doc.body || !anchor) return;
    if (anchor === 'bottom') return frame.contentWindow.scrollTo({ top: doc.body.scrollHeight, behavior: 'instant' });
    if (anchor === 'top') return frame.contentWindow.scrollTo({ top: 0, behavior: 'instant' });
    const target = doc.getElementById(anchor);
    if (target) frame.contentWindow.scrollTo({ top: target.getBoundingClientRect().top + frame.contentWindow.scrollY - 72, behavior: 'instant' });
  }
  // Desktop mode renders the site at a real 1280px width, shrunk to fit the pane.
  let phone = false;
  function layoutFrame() {
    const stage = $('#stage');
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh) return;
    const w = phone ? 390 : 1280;
    const scale = Math.min(1, (phone ? sw - 28 : sw) / w);
    const top = phone ? 14 : 0;
    frame.style.width = w + 'px';
    frame.style.height = (sh - top * 2) / scale + 'px';
    frame.style.transform = `scale(${scale})`;
    frame.style.left = Math.max(0, (sw - w * scale) / 2) + 'px';
    frame.style.top = top + 'px';
  }
  new ResizeObserver(layoutFrame).observe($('#stage'));

  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    // show everything straight away (the live site fades sections in while scrolling)
    doc.querySelectorAll('.reveal').forEach((n) => { n.style.transition = 'none'; n.classList.add('is-visible'); });
    // images added in this session are not on the site yet, so show them from memory
    doc.querySelectorAll('img').forEach((img) => {
      const p = pending[img.getAttribute('src')];
      if (p) img.src = p.dataUrl;
    });
    // keep the preview self-contained: links should not navigate away from it
    doc.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || !a.getAttribute('href')) return;
      e.preventDefault();
      const h = a.getAttribute('href');
      if (h.startsWith('#') && h.length > 1) { const t = doc.getElementById(h.slice(1)); if (t) t.scrollIntoView({ behavior: 'instant' }); }
    }, true);
    scrollFrame(previewAnchor);
  });

  /* ---------- Playbook files ---------- */
  const slugify = (n) => String(n || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  const pdfPath = (slug) => `assets/playbooks/motionholic-${slug}-playbook.pdf`;
  const coverPath = (slug) => `assets/playbooks/${slug}-cover.jpg`;
  // The file name is fixed the first time it is needed, so renaming later never breaks a link.
  function ensureSlug(item) {
    if (item.slug) return item.slug;
    const taken = new Set(content.playbooks.items.map((p) => p.slug).filter(Boolean));
    const base = slugify(item.name) || 'playbook';
    let s = base, i = 2;
    while (taken.has(s)) s = `${base}-${i++}`.slice(0, 40);
    item.slug = s;
    return s;
  }
  const onSite = {}; // path -> true/false, checked once per path
  const shown = {};  // path -> picture of a cover published in this session (the site needs ~30s to show it)
  async function existsOnSite(path) {
    if (path in onSite) return onSite[path];
    try { onSite[path] = (await fetch('/' + path, { method: 'HEAD', cache: 'no-store' })).ok; } catch { onSite[path] = false; }
    return onSite[path];
  }
  const mb = (bytes) => (bytes / 1048576).toFixed(1) + ' MB';

  async function preparePdf(file, path) {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Please choose a PDF file');
    if (file.size > 2.4 * 1024 * 1024) throw new Error(`That PDF is ${mb(file.size)}. The limit is 2.4 MB. Compress it (for example with Adobe Acrobat “Reduce File Size”) and try again.`);
    const base64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(file); });
    return { path, base64, dataUrl: null, label: `${file.name} (${mb(file.size)})` };
  }

  function buildPlaybookFile(f, item) {
    const isCover = f.kind === 'cover';
    const status = el('div', { class: 'hint' });
    const thumb = el('img', { alt: '', style: 'width:64px;height:90px;object-fit:cover;border-radius:6px;background:var(--panel-2);display:none;flex:none' });
    const input = el('input', { type: 'file', accept: isCover ? 'image/png,image/jpeg,image/webp' : 'application/pdf', hidden: true });
    const btn = el('button', { class: 'btn btn--sm', type: 'button', onclick: () => {
      if (!item.name.trim()) return toast('Type the playbook’s name first, then add its files.', true);
      input.click();
    } }, isCover ? 'Choose cover image…' : 'Choose PDF…');
    // before the file name is fixed, work out what it WOULD be so existing files are recognised
    const pathNow = () => { const s = item.slug || slugify(item.name); return s ? (isCover ? coverPath(s) : pdfPath(s)) : ''; };
    async function refresh() {
      const p = pathNow();
      if (p && pending[p]) {
        status.textContent = `New file ready: ${pending[p].label || 'cover image'}. It goes live when you publish.`;
        status.style.color = 'var(--gold-2)';
        if (isCover) { thumb.src = pending[p].dataUrl; thumb.style.display = 'block'; }
        return;
      }
      if (p && await existsOnSite(p)) {
        status.textContent = 'On your site now. Choose a file to replace it.';
        status.style.color = 'var(--green)';
        if (isCover) { thumb.src = shown[p] || '/' + p + '?t=' + (item.rev || ''); thumb.style.display = 'block'; }
        return;
      }
      status.textContent = isCover ? 'No cover yet. Needed before this playbook can be published.' : 'No PDF yet. Needed before this playbook can be published.';
      status.style.color = 'var(--red)';
      thumb.style.display = 'none';
    }
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      btn.disabled = true; btn.textContent = 'Preparing…';
      try {
        const slug = ensureSlug(item);
        const path = isCover ? coverPath(slug) : pdfPath(slug);
        let up;
        if (isCover) {
          up = await prepareImage(file, { maxSide: 800, forceJpeg: true });
          up = { ...up, path };
        } else up = await preparePdf(file, path);
        pending[path] = up;
        if (await existsOnSite(path)) item.rev = Date.now().toString(36); // replacing a file: new link so nobody sees the old copy
        markDirty(); document.dispatchEvent(new Event('pb-refresh'));
      } catch (e) { toast(e.message, true); }
      btn.disabled = false; btn.textContent = isCover ? 'Choose cover image…' : 'Choose PDF…'; input.value = '';
    });
    refresh();
    // keep the status right when the name is typed or the other file is chosen
    const again = () => { if (!status.isConnected) { document.removeEventListener('change', again); document.removeEventListener('pb-refresh', again); return; } refresh(); };
    document.addEventListener('change', again); document.addEventListener('pb-refresh', again);
    return el('div', { class: 'field' }, el('span', { class: 'label' }, f.label),
      el('div', { class: 'img', style: 'align-items:center' }, isCover ? thumb : null, el('div', { class: 'img__body' }, status, el('div', {}, btn), input)),
      isCover ? el('span', { class: 'hint' }, 'Portrait, like a book cover (about 595 × 842). JPG or PNG; it is resized for you.') : el('span', { class: 'hint' }, 'PDF up to 2.4 MB.'));
  }

  /* ---------- Field builders ---------- */
  function fieldWrap(f, input, extra) {
    const id = 'f' + Math.random().toString(36).slice(2, 9);
    if (input.id === '') input.id = id;
    return el('div', { class: 'field' },
      el('label', { for: input.id }, f.label),
      input,
      extra,
      f.hint ? el('span', { class: 'hint' }, f.hint) : null);
  }

  function buildField(f, obj) {
    if (f.row) return el('div', { class: 'row2' }, f.row.map((x) => buildField(x, obj)));
    if (f.type === 'heading') return el('div', {}, el('h3', { class: 'subhead' }, f.label), f.hint ? el('p', { class: 'hint' }, f.hint) : null);
    if (f.type === 'list') return buildList(f, obj);
    if (f.type === 'image') return buildImage(f, obj);
    if (f.type === 'pbfile') return buildPlaybookFile(f, obj);

    const isArea = f.type === 'textarea' || f.type === 'lines';
    const input = isArea ? el('textarea', { rows: f.rows || 3 }) : el('input', { type: f.type === 'url' ? 'url' : 'text' });
    input.value = f.type === 'lines' ? (obj[f.key] || []).join('\n') : (obj[f.key] ?? '');
    let counter = null;
    if (f.max) {
      counter = el('div', { class: 'count' });
      const upd = () => { counter.textContent = `${input.value.length} / ${f.max} characters`; counter.classList.toggle('is-over', input.value.length > f.max); };
      input.addEventListener('input', upd); upd();
    }
    input.addEventListener('input', () => {
      obj[f.key] = f.type === 'lines' ? input.value.split('\n').map((x) => x.trim()).filter(Boolean) : input.value;
      markDirty();
    });
    if (f.type === 'youtube') {
      const wrap = fieldWrap(f, input, counter);
      const thumb = el('img', { alt: '', style: 'width:160px;border-radius:8px;border:1px solid var(--line);margin-top:4px;display:none' });
      const upd = () => {
        const m = input.value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) || input.value.trim().match(/^([A-Za-z0-9_-]{11})$/);
        if (m) { thumb.src = `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg`; thumb.style.display = 'block'; } else thumb.style.display = 'none';
      };
      input.addEventListener('input', upd); upd();
      wrap.insertBefore(thumb, wrap.querySelector('.hint'));
      return wrap;
    }
    return fieldWrap(f, input, counter);
  }

  function buildImage(f, obj) {
    const src = (v) => (v ? (pending[v] ? pending[v].dataUrl : /^https?:/.test(v) ? v : '/' + v) : '');
    const img = el('img', { alt: '' });
    const name = el('div', { class: 'img__name' });
    const refresh = () => {
      const v = obj[f.key];
      img.style.visibility = v ? 'visible' : 'hidden';
      if (v) img.src = src(v);
      name.textContent = v ? v.split('/').pop() : 'No image yet';
    };
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
    const choose = el('button', { class: 'btn btn--sm', type: 'button', onclick: () => file.click() }, 'Choose a new image…');
    const remove = el('button', { class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => { obj[f.key] = ''; refresh(); markDirty(); } }, 'Remove');
    file.addEventListener('change', async () => {
      const f0 = file.files[0];
      if (!f0) return;
      choose.disabled = true; choose.textContent = 'Preparing…';
      try {
        const up = await prepareImage(f0);
        pending[up.path] = up;
        obj[f.key] = up.path; refresh(); markDirty();
      } catch (e) { toast(e.message, true); }
      choose.disabled = false; choose.textContent = 'Choose a new image…'; file.value = '';
    });
    refresh();
    return el('div', { class: 'field' },
      el('span', { class: 'label' }, f.label),
      el('div', { class: 'img' }, img, el('div', { class: 'img__body' }, name, el('div', { style: 'display:flex;gap:8px' }, choose, f.key === 'photo' ? remove : null), file)),
      f.hint ? el('span', { class: 'hint' }, f.hint) : null);
  }

  function buildList(f, parent) {
    const arr = parent[f.key];
    const wrap = el('div', { class: 'field' }, el('span', { class: 'label' }, f.label));
    const list = el('div', { class: 'list' });
    const keyOf = (i) => `${current}.${f.key}.${i}`;

    const redraw = () => { const y = $('#editor').scrollTop; renderEditor(); $('#editor').scrollTop = y; };

    arr.forEach((item, i) => {
      const k = keyOf(i);
      const card = el('div', { class: 'item' + (open.has(k) ? ' is-open' : '') });
      const title = el('span', { class: 'item__title' }, (f.itemTitle && f.itemTitle(item, i)) || `Untitled ${f.itemName}`,
        f.itemSub && f.itemSub(item) ? el('small', {}, f.itemSub(item)) : null);
      const move = (d) => () => { const j = i + d; [arr[i], arr[j]] = [arr[j], arr[i]]; markDirty(); redraw(); };
      const tools = f.fixed ? null : el('div', { class: 'item__tools', onclick: (e) => e.stopPropagation() },
        el('button', { type: 'button', title: 'Move up', disabled: i === 0, 'aria-label': 'Move up', onclick: move(-1) }, '↑'),
        el('button', { type: 'button', title: 'Move down', disabled: i === arr.length - 1, 'aria-label': 'Move down', onclick: move(1) }, '↓'),
        el('button', { type: 'button', class: 'del', title: 'Delete', 'aria-label': 'Delete', disabled: arr.length <= (f.min || 0), onclick: () => {
          if (!confirm(`Delete this ${f.itemName}? You can bring it back from “Past versions” after saving.`)) return;
          arr.splice(i, 1); open.clear(); markDirty(); redraw();
        } }, 'Delete'));
      const head = el('div', { class: 'item__head', onclick: () => {
        card.classList.toggle('is-open');
        card.classList.contains('is-open') ? open.add(k) : open.delete(k);
        if (card.classList.contains('is-open') && f.key === 'plans') scrollFrame('pricing');
      } },
        el('span', { class: 'item__n' }, i + 1), title, tools, el('span', { class: 'item__chev' }, '›'));
      const bodyEl = el('div', { class: 'item__body' }, f.fields.map((sub) => buildField(sub, item)));
      // keep the card title in step with what is typed
      bodyEl.addEventListener('input', () => {
        title.firstChild.textContent = (f.itemTitle && f.itemTitle(item, i)) || `Untitled ${f.itemName}`;
        const sm = title.querySelector('small');
        if (sm && f.itemSub) sm.textContent = f.itemSub(item);
      });
      card.append(head, bodyEl);
      list.append(card);
    });
    wrap.append(list);
    if (!f.fixed) {
      const atMax = f.max && arr.length >= f.max;
      wrap.append(el('button', { class: 'btn', type: 'button', disabled: atMax, onclick: () => {
        arr.push(f.blank()); open.add(keyOf(arr.length - 1)); markDirty(); redraw();
      } }, atMax ? `Maximum of ${f.max} reached` : `+ ${f.addLabel}`));
    }
    return wrap;
  }

  /* ---------- Screens ---------- */
  function renderSide() {
    const side = $('#side');
    side.replaceChildren();
    let n = 0;
    SECTIONS.forEach((s) => {
      if (s.group) side.append(el('div', { class: 'side__group' }, s.group));
      const btn = el('button', { type: 'button', class: s.id === current ? 'is-on' : '', onclick: () => select(s.id) },
        el('span', { class: 'num' }, s.special ? '★' : ++n), s.title);
      side.append(btn);
    });
  }

  function select(id) {
    current = id;
    renderSide();
    renderEditor();
    $('#editor').scrollTop = 0;
    const s = SECTIONS.find((x) => x.id === id);
    if (s && s.anchor) scrollFrame(s.anchor);
    else if (id === 'start') scrollFrame('top');
  }

  function renderEditor() {
    const ed = $('#editor');
    const s = SECTIONS.find((x) => x.id === current);
    ed.replaceChildren();
    if (s.special) return ed.append(...startScreen());
    ed.append(el('h1', {}, s.title), el('p', { class: 'lede' }, s.lede || ''));
    s.fields.forEach((f) => ed.append(buildField(f, content[s.id])));
  }

  function startScreen() {
    const jump = SECTIONS.filter((x) => !x.special && x.anchor).slice(0, 7);
    return [
      el('h1', {}, 'Edit your website'),
      el('p', { class: 'lede' }, 'Change the words, pictures, prices and links on motionholic.com with simple forms. No code, nothing to break. Changes only go live when you press “Publish changes”.'),
      el('div', { class: 'start' },
        step(1, 'Pick a section on the left', 'They follow the order of your page, from the top banner down to the footer.'),
        step(2, 'Change anything you like', 'The preview on the right updates as you type. It scrolls to the section you are editing.'),
        step(3, 'Press “Publish changes”', 'Your edits go live on motionholic.com within about 30 seconds. Every earlier version is kept under “Past versions”, so you can always go back.'),
        step(4, 'Nothing goes live until you publish', 'Edits stay in this window until you press Publish, so you can experiment freely.')),
      el('p', { class: 'subhead' }, 'Jump straight to'),
      el('div', { class: 'start__go' }, jump.map((x) => el('button', { class: 'chip', type: 'button', onclick: () => select(x.id) }, x.title))),
    ];
    function step(n, a, b) { return el('div', { class: 'start__step' }, el('span', { class: 'start__n' }, n), el('div', {}, el('strong', {}, a), el('span', {}, b))); }
  }

  /* ---------- Images ---------- */
  // Shrinks big phone/camera photos before they go on the site, so pages stay fast.
  async function prepareImage(file, opts = {}) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Please choose a JPG, PNG, WebP or GIF image');
    const bmp = await createImageBitmap(file).catch(() => { throw new Error('That image could not be opened'); });
    const scale = Math.min(1, (opts.maxSide || 1600) / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const keepPng = !opts.forceJpeg && file.type === 'image/png' && file.size < 300 * 1024;
    if (!keepPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bmp, 0, 0, w, h);
    const type = keepPng ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(type, 0.86);
    const base64 = dataUrl.split(',')[1];
    if (base64.length > 2.6 * 1024 * 1024) throw new Error('That image is still too large. Try a smaller one.');
    const slug = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
    return { path: `assets/uploads/${Date.now().toString(36)}-${slug}.${keepPng ? 'png' : 'jpg'}`, base64, dataUrl };
  }

  // Every playbook needs a name, a page count, and both files (new now, or already on the site).
  async function playbookProblem() {
    for (const p of content.playbooks.items) {
      if (!p.name.trim()) return 'One of your playbooks has no name yet. Fill it in or delete it.';
      if (!(Number(p.pages) >= 1)) return `Enter the number of pages for “${p.name}”.`;
      const paths = [['PDF', pdfPath(p.slug)], ['cover image', coverPath(p.slug)]];
      for (const [what, path] of paths) {
        if (!pending[path] && !(await existsOnSite(path))) return `“${p.name}” still needs its ${what}.`;
      }
    }
    return null;
  }

  /* ---------- Publish, history ---------- */
  async function save() {
    if (saving || !dirty) return;
    if (!confirm('Publish these changes to motionholic.com?\n\nThey will be live within about 30 seconds. You can undo any change later from “Past versions”.')) return;
    for (const p of content.playbooks.items) if (p.name.trim()) ensureSlug(p);
    const problem = await playbookProblem();
    if (problem) { toast(problem, true); return; }
    const json = JSON.stringify(content);
    const wanted = new Set(content.playbooks.items.flatMap((p) => [pdfPath(p.slug), coverPath(p.slug)]));
    const uploads = {};
    Object.keys(pending).forEach((p) => { if (json.includes(p) || wanted.has(p)) uploads[p] = pending[p].base64; });
    const size = Object.values(uploads).reduce((n, b) => n + b.length, 0);
    if (size > 3.9 * 1024 * 1024) { toast('The new files are too big to publish together. Publish the playbook files on their own first, then your other changes.', true); return; }
    saving = true; $('#btnSave').disabled = true; setStatus('dirty', 'Publishing…');
    try {
      const out = await api('save', { method: 'PUT', body: JSON.stringify({ content, baseSha, uploads }) });
      content = out.content; baseSha = out.sha; dirty = false;
      Object.keys(uploads).forEach((p) => { if (pending[p] && pending[p].dataUrl) shown[p] = pending[p].dataUrl; onSite[p] = true; delete pending[p]; });
      setStatus('', 'Published');
      toast('Published! It will be visible on motionholic.com in about 30 seconds.');
      renderEditor();
    } catch (e) {
      $('#btnSave').disabled = false; setStatus('error', 'Not published'); toast(e.message, true);
    }
    saving = false;
  }

  async function openHistory() {
    const list = $('#historyList');
    list.replaceChildren(el('li', { class: 'empty' }, 'Loading…'));
    $('#historyDialog').showModal();
    try {
      const rows = await api('history');
      list.replaceChildren();
      if (!rows.length) list.append(el('li', { class: 'empty' }, 'No past versions yet.'));
      rows.forEach((r, i) => {
        const d = new Date(r.time);
        list.append(el('li', {}, el('span', {}, d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), i === 0 ? el('small', { style: 'color:var(--muted);margin-left:8px' }, 'current') : null),
          i === 0 ? null : el('button', { class: 'btn btn--sm', type: 'button', onclick: async () => {
            if (!confirm('Put this earlier version back on motionholic.com?' + (dirty ? '\n\nYour unpublished changes here will be replaced.' : ''))) return;
            try {
              const out = await api('restore', { method: 'POST', body: JSON.stringify({ sha: r.sha }) });
              content = out.content; baseSha = out.sha; dirty = false; $('#btnSave').disabled = true;
              setStatus('', 'Published'); renderEditor(); reloadFrame();
              $('#historyDialog').close(); toast('Earlier version restored. It will be live in about 30 seconds.');
            } catch (e) { toast(e.message, true); }
          } }, 'Restore')));
      });
    } catch (e) { list.replaceChildren(el('li', { class: 'empty' }, e.message)); }
  }

  /* ---------- Sign in / boot ---------- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#loginPassword').focus(); }

  async function boot() {
    const out = await api('content');
    content = out.content; baseSha = out.sha;
    $('#login').hidden = true; $('#app').hidden = false;
    renderSide(); renderEditor(); reloadFrame();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try {
      await api('login', { method: 'POST', body: JSON.stringify({ password: $('#loginPassword').value }) });
      $('#loginPassword').value = '';
      await boot();
    } catch (err) { $('#loginError').textContent = err.message === 'Wrong password' ? 'That password isn’t right. Try again.' : err.message; }
  });
  $('#btnLogout').addEventListener('click', async () => {
    if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
    dirty = false; await api('logout', { method: 'POST' }); location.reload();
  });
  $('#btnSave').addEventListener('click', save);
  $('#btnHistory').addEventListener('click', openHistory);
  $('#btnPreviewToggle').addEventListener('click', () => {
    const off = $('#layout').classList.toggle('no-preview');
    $('#btnPreviewToggle').textContent = off ? 'Show preview' : 'Hide preview';
  });
  document.querySelectorAll('.preview__sizes button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.preview__sizes button').forEach((x) => x.classList.toggle('is-on', x === b));
    phone = b.dataset.w !== '100%';
    $('#stage').classList.toggle('is-phone', phone);
    layoutFrame();
    setTimeout(() => scrollFrame(previewAnchor), 120);
  }));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  api('session').then((s) => {
    if (s.setupNeeded && s.setupNeeded.length) $('#loginError').textContent = 'The admin is not switched on yet. Still to set up: ' + s.setupNeeded.join(', ') + '.';
    return s.authed ? boot() : showLogin();
  }).catch(showLogin);
})();
