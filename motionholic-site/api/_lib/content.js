// Checks everything that arrives from the admin before it can touch the site.
const { youtubeId } = require('./render');

const SECTIONS = ['settings', 'seo', 'hero', 'showreel', 'about', 'services', 'work', 'process', 'numbers', 'pricing', 'testimonials', 'playbooks', 'faq', 'cta', 'footer'];
const IMG_PATH = /^assets\/(?!.*\.\.)[A-Za-z0-9._\/-]+\.(?:jpe?g|png|webp|gif)$/i;
const UPLOAD_PATH = /^assets\/uploads\/[a-z0-9][a-z0-9._-]{0,80}\.(?:jpe?g|png|webp|gif)$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PB_PDF = /^assets\/playbooks\/motionholic-([a-z0-9]+(?:-[a-z0-9]+)*)-playbook\.pdf$/;
const PB_COVER = /^assets\/playbooks\/([a-z0-9]+(?:-[a-z0-9]+)*)-cover\.jpg$/;
const pdfPath = (slug) => `assets/playbooks/motionholic-${slug}-playbook.pdf`;
const coverPath = (slug) => `assets/playbooks/${slug}-cover.jpg`;

function validate(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Content must be an object';
  for (const k of SECTIONS) if (!c[k] || typeof c[k] !== 'object') return `Missing section: ${k}`;
  const lists = [c.playbooks.items, c.services.items, c.work.videos, c.process.steps, c.pricing.plans, c.testimonials.items, c.faq.items, c.numbers.stats, c.numbers.cards];
  if (lists.some((l) => !Array.isArray(l))) return 'A list is missing';
  if (c.numbers.cards.length !== 8) return 'The Numbers section needs exactly 8 cards';
  if (c.numbers.stats.length !== 6) return 'The Numbers section needs exactly 6 scrolling stats';
  if (c.pricing.plans.length < 1 || c.pricing.plans.length > 3) return 'Pricing needs between 1 and 3 plans';
  for (const u of [c.settings.calendly, c.settings.instagram, c.settings.linkedin]) {
    if (u && !/^https?:\/\/[^\s"'<>]+$/i.test(u)) return 'Links must start with http:// or https:// and contain no spaces';
  }
  if (c.settings.email && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(c.settings.email)) return 'That email address does not look right';
  if (c.playbooks.items.length < 1 || c.playbooks.items.length > 10) return 'Add between 1 and 10 playbooks';
  const seen = new Set();
  for (const p of c.playbooks.items) {
    if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40) return 'Every playbook needs a name (40 characters or fewer)';
    if (!SLUG.test(String(p.slug || '')) || p.slug.length > 40) return `The playbook “${p.name}” has no valid file name yet`;
    if (seen.has(p.slug)) return 'Two playbooks share the same file name';
    seen.add(p.slug);
    const pages = Number(p.pages);
    if (!Number.isInteger(pages) || pages < 1 || pages > 999) return `Give the playbook “${p.name}” a page count between 1 and 999`;
    if (p.rev && !/^[a-z0-9]{1,16}$/.test(String(p.rev))) return 'A playbook version tag is invalid';
  }
  const imgs = [c.about.image, ...c.testimonials.items.map((t) => t.photo)];
  for (const i of imgs) if (i && !IMG_PATH.test(i)) return 'An image path is not valid';
  const text = JSON.stringify(c);
  if (text.length > 400 * 1024) return 'The content is too large';
  return null;
}

// Cleans up what the forms produce so the renderer always gets tidy data.
function normalise(c) {
  c.showreel.video = youtubeId(c.showreel.video);
  c.work.videos.forEach((v) => { v.video = youtubeId(v.video); });
  c.playbooks.items.forEach((p) => { p.name = String(p.name || '').trim(); p.pages = Number(p.pages); });
  c.pricing.plans.forEach((p) => {
    if (typeof p.features === 'string') p.features = p.features.split('\n').map((x) => x.trim()).filter(Boolean);
  });
  return c;
}

const MAGIC = [
  [/\.jpe?g$/, [0xff, 0xd8, 0xff]],
  [/\.png$/, [0x89, 0x50, 0x4e, 0x47]],
  [/\.gif$/, [0x47, 0x49, 0x46, 0x38]],
  [/\.webp$/, [0x52, 0x49, 0x46, 0x46]],
];

// uploads: { 'assets/uploads/x.jpg': '<base64>' } -> error text or null.
// content is passed so playbook files can only be added for playbooks that are in the list.
function validateUploads(uploads, content) {
  const entries = Object.entries(uploads || {});
  if (entries.length > 12) return 'Too many new files at once';
  const slugs = new Set(((content && content.playbooks && content.playbooks.items) || []).map((p) => p.slug));
  for (const [p, b64] of entries) {
    const pdf = PB_PDF.exec(p), cover = PB_COVER.exec(p);
    if (!UPLOAD_PATH.test(p) && !pdf && !cover) return 'An uploaded file has an invalid name';
    if ((pdf || cover) && !slugs.has((pdf || cover)[1])) return 'An uploaded playbook file does not match any playbook in the list';
    const buf = Buffer.from(String(b64), 'base64');
    if (!buf.length || buf.length > 3 * 1024 * 1024) return 'An uploaded file is empty or larger than 3 MB';
    const magic = pdf ? [0x25, 0x50, 0x44, 0x46, 0x2d] : cover ? [0xff, 0xd8, 0xff] : (MAGIC.find(([re]) => re.test(p)) || [])[1];
    if (!magic || !magic.every((b, i) => buf[i] === b)) return pdf ? 'That file is not a real PDF' : 'An uploaded file is not a real image';
  }
  return null;
}

// Playbooks added in this save must have both their PDF and cover (uploaded now, or already on the site).
// existing: Set of paths already in assets/playbooks; before: slugs that were already published.
function missingPlaybookFiles(content, uploads, existing, before) {
  const miss = [];
  for (const p of content.playbooks.items) {
    if (before.has(p.slug)) continue;
    const need = [];
    if (!(pdfPath(p.slug) in (uploads || {})) && !existing.has(pdfPath(p.slug))) need.push('PDF');
    if (!(coverPath(p.slug) in (uploads || {})) && !existing.has(coverPath(p.slug))) need.push('cover image');
    if (need.length) miss.push(`“${p.name}” still needs its ${need.join(' and ')}`);
  }
  return miss.length ? miss.join('. ') + '.' : null;
}

module.exports = { validate, normalise, validateUploads, missingPlaybookFiles, pdfPath, coverPath };
