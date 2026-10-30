// Fills site/template.html with the text from data/content.json.
const fs = require('fs');
const path = require('path');

const DEFAULT_CALENDLY = 'https://calendly.com/ayonpalovi10/video-editing-service';
const DEFAULT_INSTAGRAM = 'https://www.instagram.com/ovisperspective/';
const DEFAULT_LINKEDIN = 'https://www.linkedin.com/in/ayonkumarpaulovi/';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// Accepts a bare ID or any YouTube link and returns the 11-character video ID.
function youtubeId(v) {
  const s = String(v || '').trim();
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) || s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : s;
}

const paragraphs = (t) => String(t || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const num = (s) => Number(String(s).replace(/[^0-9.]/g, '')) || 0;

const sections = {
  hero: (c) => `  <section class="hero" id="top">
    <div class="hero__smoke">
      <canvas class="hero__canvas" id="heroCanvas" aria-hidden="true"></canvas>
      <div class="smoke smoke--1"></div>
      <div class="smoke smoke--2"></div>
      <div class="smoke smoke--3"></div>
    </div>
    <div class="hero__content">
      <h1 class="hero__title">
        <span class="hero-line">${esc(c.hero.line1)}</span>
        <span class="hero-line">${esc(c.hero.line2)}</span>
      </h1>
      <p class="hero__sub">${esc(c.hero.sub).replace(/ +I +/g, ' &nbsp;I&nbsp; ')}</p>
      <a href="${DEFAULT_CALENDLY}" target="_blank" rel="noopener" class="btn btn--gold btn--lg hero__cta">${esc(c.hero.cta)}</a>
    </div>
  </section>`,

  showreel: (c) => {
    const id = esc(youtubeId(c.showreel.video));
    return `  <section class="showreel section" id="showreel">
    <div class="container container--narrow">
      <h2 class="reveal">${esc(c.showreel.heading)}</h2>
      <p class="showreel__sub reveal">${esc(c.showreel.sub)}</p>
    </div>
    <div class="container">
      <div class="showreel__frame reveal">
        <div class="video-embed video-embed--hero" data-video-id="${id}">
          <img src="https://img.youtube.com/vi/${id}/maxresdefault.jpg" alt="Motionholic introduction video" loading="lazy" onerror="this.onerror=null;this.src=this.src.replace('maxresdefault','hqdefault')" />
          <button class="video-embed__play" aria-label="Play introduction video"><span></span></button>
        </div>
      </div>
    </div>
  </section>`;
  },

  about: (c) => `  <section class="why section" id="why">
    <div class="container">
      <div class="why__grid">
        <figure class="why__media reveal">
          <img src="${esc(c.about.image)}" alt="${esc(c.about.imageAlt)}" loading="lazy" />
        </figure>
        <div class="why__content">
          <h2 class="reveal">${esc(c.about.heading)}</h2>
${paragraphs(c.about.body).map((p) => `          <p class="why__text reveal">${esc(p)}</p>`).join('\n')}
        </div>
      </div>
    </div>
  </section>`,

  services: (c) => `  <section class="offers section" id="offers">
    <div class="container">
      <h2 class="reveal">${esc(c.services.heading)}</h2>
      <p class="offers__intro reveal">${esc(c.services.intro)}</p>
      <div class="offers__grid">
${c.services.items.map((i) => `        <div class="offer-card reveal">
          <h3>${esc(i.title)}</h3>
          <p>${esc(i.text)}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`,

  work: (c) => `  <section class="work section" id="work">
    <div class="container">
      <h2 class="reveal">${esc(c.work.heading)}</h2>
      <div class="work__grid" id="workGrid">
${c.work.videos.map((v) => {
    const id = esc(youtubeId(v.video));
    return `        <div class="work-card reveal">
          <div class="video-embed" data-video-id="${id}">
            <img src="https://i.ytimg.com/vi/${id}/oardefault.jpg" onerror="this.onerror=null;this.src='https://img.youtube.com/vi/${id}/hqdefault.jpg'" alt="${esc(v.label)}" loading="lazy" />
            <button class="video-embed__play" aria-label="Play video"><span></span></button>
          </div>
        </div>`;
  }).join('\n')}
      </div>
    </div>
  </section>`,

  process: (c) => `  <section class="process section" id="process">
    <div class="container">
      <h2 class="reveal">${esc(c.process.heading)}</h2>
      <div class="process__grid">
${c.process.steps.map((s, i) => `        <div class="process-step reveal">
          <span class="process-step__num">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`,

  pricing: (c) => {
    const plans = c.pricing.plans;
    const grid = plans.length === 3 ? ' pricing__grid--three' : '';
    return `  <section class="pricing section" id="pricing">
    <div class="container">
      <h2 class="reveal">${esc(c.pricing.heading)}</h2>
      <div class="pricing__grid${grid}">
${plans.map((p) => `        <div class="price-card${p.badge ? ' price-card--popular' : ''} reveal">
${p.badge ? `          <span class="price-card__badge">${esc(p.badge)}</span>\n` : ''}          <h3>${esc(p.name)}</h3>
          <p class="price-card__tag">${esc(p.tag)}</p>
          <p class="price-card__price"><strong>${esc(p.price)}</strong> <span>${esc(p.unit)}</span></p>
${p.inherits ? `          <p class="price-card__inherits">${esc(p.inherits)}</p>\n` : ''}          <ul>
${(p.features || []).map((f) => `            <li>${esc(f)}</li>`).join('\n')}
          </ul>
${p.value ? `          <p class="price-card__value">${esc(p.value)}</p>\n` : ''}          <a href="${DEFAULT_CALENDLY}" target="_blank" rel="noopener" class="btn btn--gold">${esc(p.button || 'Book a Call')}</a>
        </div>`).join('\n')}
      </div>
      <p class="pricing__note reveal">${esc(c.pricing.note)}</p>
    </div>
  </section>`;
  },

  testimonials: (c) => {
    const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    return `  <section class="testimonials section" id="testimonials">
    <div class="container">
      <h2 class="reveal">${esc(c.testimonials.heading)}</h2>
      <div class="testimonials__grid">
${c.testimonials.items.map((t) => `        <div class="t-card reveal">
          <div class="t-card__head">
            <div class="t-card__avatar t-card__avatar--photo">
              <span>${esc(initials(t.name))}</span>
${t.photo ? `              <img src="${esc(t.photo)}" alt="${esc(t.name)}, ${esc(t.role)}" loading="lazy" onerror="this.remove()" />\n` : ''}            </div>
            <div><h4>${esc(t.name)}</h4><span>${esc(t.role)}</span></div>
          </div>
          <p>“${esc(t.quote)}”</p>
        </div>`).join('\n')}
      </div>
      <p class="testimonials__disclaimer reveal">
        ${esc(c.testimonials.disclaimer)}
      </p>
    </div>
  </section>`;
  },

  playbooks: (c) => {
    const items = c.playbooks.items;
    const n = items.length;
    const eyebrow = String(c.playbooks.eyebrow || '').replace(/\{n\}/g, String(n)).replace(/\b1 niches\b/, '1 niche');
    const v = (it) => (it.rev ? `?v=${esc(it.rev)}` : '');
    const pdf = (it) => `assets/playbooks/motionholic-${esc(it.slug)}-playbook.pdf${v(it)}`;
    const slots = ['front', 'right', 'left'];
    const first = items[0];
    return `  <section class="pbx section" id="playbooks">
    <div class="container">
      <div class="pbx__panel reveal">
        <div class="pbx__stack" aria-hidden="true">
${items.map((it, i) => `          <img class="pbx__cover${slots[i] ? ' pbx__cover--' + slots[i] : ''}" data-slug="${esc(it.slug)}" src="assets/playbooks/${esc(it.slug)}-cover.jpg${v(it)}" alt="" loading="lazy" />`).join('\n')}
        </div>
        <div class="pbx__body">
          <span class="pbx__eyebrow">${esc(eyebrow)}</span>
          <h2>${esc(c.playbooks.heading)}</h2>
          <p class="pbx__sub">${esc(c.playbooks.sub)}</p>
          <div class="pbx__chips" role="radiogroup" aria-label="Choose your niche">
${items.map((it, i) => `          <button type="button" class="pbx__chip${i === 0 ? ' is-active' : ''}" role="radio" aria-checked="${i === 0}" data-slug="${esc(it.slug)}" data-name="${esc(it.name)}" data-pages="${esc(it.pages)}" data-v="${esc(it.rev || '')}">${esc(it.name)}</button>`).join('\n')}
          <a class="pbx__ask" href="${DEFAULT_CALENDLY}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Not listed? Book a call
          </a>
          </div>
          <div class="pbx__actions">
            <a class="btn" id="pbxDownload" href="${pdf(first)}" download><span id="pbxLabel">Download The ${esc(first.name)} Playbook</span></a>
            <span class="pbx__meta"><span id="pbxMeta">Free PDF &middot; ${esc(first.pages)} pages</span></span>
          </div>
          <a class="pbx__ask-line" href="${DEFAULT_CALENDLY}" target="_blank" rel="noopener">Don&rsquo;t see your niche? <span>Book a free call &rarr;</span></a>
        </div>
      </div>
    </div>
  </section>`;
  },

  faq: (c) => `  <section class="faq section" id="faq">
    <div class="container container--narrow">
      <h2 class="reveal">${esc(c.faq.heading)}</h2>
    </div>
    <div class="container">
      <div class="faq__list reveal" id="faqList">
${c.faq.items.map((f) => `        <div class="faq-item">
          <button class="faq-item__q">${esc(f.q)}<span class="faq-item__icon"></span></button>
          <div class="faq-item__a"><p>${esc(f.a)}</p></div>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`,
};

// Numbers: the scrolling stat rows (first 3 stats = left column, next 3 = right column)
const ticker = (c, col) => {
  const rows = c.numbers.stats.slice(col * 3, col * 3 + 3).map((s) =>
    `                  <div class="mini-stat"><div class="mini-stat__head"><span class="mini-stat__dot"></span>${esc(s.label)}</div><div class="mini-stat__row"><strong>${esc(s.value)}</strong><span class="pill-up">${esc(s.change)} &#8599;</span></div></div>`);
  return rows.concat(rows).join('\n'); // duplicated so the loop animation is seamless
};

// Keeps the machine-readable data Google reads in step with what is on the page.
function jsonld(c) {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'jsonld.base.json'), 'utf8'));
  const g = base['@graph'];
  const biz = g.find((n) => n['@type'] === 'ProfessionalService');
  biz.email = c.settings.email;
  biz.sameAs = [c.settings.instagram, c.settings.linkedin].filter(Boolean);
  const tpl = biz.hasOfferCatalog.itemListElement[0];
  biz.hasOfferCatalog.itemListElement = c.services.items.map((s) => {
    const o = JSON.parse(JSON.stringify(tpl));
    o.itemOffered.name = s.title;
    o.itemOffered.description = s.text;
    return o;
  });
  const offers = biz.makesOffer;
  biz.makesOffer = c.pricing.plans.map((p, i) => {
    const o = offers[i] ? JSON.parse(JSON.stringify(offers[i])) : JSON.parse(JSON.stringify(offers[0]));
    const amount = num(p.price);
    o.name = p.name;
    o.price = amount;
    o.priceSpecification.price = amount;
    return o;
  });
  const person = g.find((n) => n['@type'] === 'Person');
  person.sameAs = [c.settings.linkedin].filter(Boolean);
  const web = g.find((n) => n['@type'] === 'WebPage');
  web.name = c.seo.title;
  const faq = g.find((n) => n['@type'] === 'FAQPage');
  faq.mainEntity = c.faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
  return `<script type="application/ld+json">\n${JSON.stringify(base, null, 2).replace(/</g, '\\u003c')}\n  </script>`;
}

function render(c) {
  let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  html = html.replace(/\{\{(@?)([\w.]+)\}\}/g, (_, at, name) => {
    if (!at) return esc(get(c, name));
    if (name === 'jsonld') return jsonld(c);
    if (name === 'ticker0') return ticker(c, 0);
    if (name === 'ticker1') return ticker(c, 1);
    return sections[name](c);
  });
  // global links
  html = html.split(DEFAULT_CALENDLY).join(esc(c.settings.calendly))
    .split(DEFAULT_INSTAGRAM).join(esc(c.settings.instagram))
    .split(DEFAULT_LINKEDIN).join(esc(c.settings.linkedin));
  return html;
}

module.exports = { render, youtubeId };
