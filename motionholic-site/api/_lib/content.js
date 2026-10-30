// Checks everything that arrives from the admin before it can touch the site.
const { youtubeId } = require('./render');

const SECTIONS = ['settings', 'seo', 'hero', 'showreel', 'about', 'services', 'work', 'process', 'numbers', 'pricing', 'testimonials', 'playbooks', 'faq', 'cta', 'footer'];
const IMG_PATH = /^assets\/(?!.*\.\.)[A-Za-z0-9._\/-]+\.(?:jpe?g|png|webp|gif)$/i;
const UPLOAD_PATH = /^assets\/uploads\/[a-z0-9][a-z0-9._-]{0,80}\.(?:jpe?g|png|webp|gif)$/;

function validate(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Content must be an object';
  for (const k of SECTIONS) if (!c[k] || typeof c[k] !== 'object') return `Missing section: ${k}`;
  const lists = [c.services.items, c.work.videos, c.process.steps, c.pricing.plans, c.testimonials.items, c.faq.items, c.numbers.stats, c.numbers.cards];
  if (lists.some((l) => !Array.isArray(l))) return 'A list is missing';
  if (c.numbers.cards.length !== 8) return 'The Numbers section needs exactly 8 cards';
  if (c.numbers.stats.length !== 6) return 'The Numbers section needs exactly 6 scrolling stats';
  if (c.pricing.plans.length < 1 || c.pricing.plans.length > 3) return 'Pricing needs between 1 and 3 plans';
  for (const u of [c.settings.calendly, c.settings.instagram, c.settings.linkedin]) {
    if (u && !/^https?:\/\/[^\s"'<>]+$/i.test(u)) return 'Links must start with http:// or https:// and contain no spaces';
  }
  if (c.settings.email && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(c.settings.email)) return 'That email address does not look right';
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

// uploads: { 'assets/uploads/x.jpg': '<base64>' } -> error text or null
function validateUploads(uploads) {
  const entries = Object.entries(uploads || {});
  if (entries.length > 12) return 'Too many new images at once';
  for (const [p, b64] of entries) {
    if (!UPLOAD_PATH.test(p)) return 'An uploaded image has an invalid name';
    const buf = Buffer.from(String(b64), 'base64');
    if (!buf.length || buf.length > 3 * 1024 * 1024) return 'An uploaded image is empty or larger than 3 MB';
    const rule = MAGIC.find(([re]) => re.test(p));
    if (!rule || !rule[1].every((b, i) => buf[i] === b)) return 'An uploaded file is not a real image';
  }
  return null;
}

module.exports = { validate, normalise, validateUploads };
