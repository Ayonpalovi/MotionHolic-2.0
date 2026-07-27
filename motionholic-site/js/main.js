// Scroll-reveal, nav behavior, and small interactions

// ----- Scroll reveal (staggered fade-up) -----
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        // stagger siblings that enter together
        const siblings = [...el.parentElement.children].filter((c) =>
          c.classList.contains('reveal')
        );
        const idx = siblings.indexOf(el);
        el.style.transitionDelay = `${Math.min(idx * 90, 450)}ms`;
        el.classList.add('is-visible');
        io.unobserve(el);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
revealEls.forEach((el) => io.observe(el));

// ----- Smooth scrolling (lerp-based, same feel as Lenis on the reference site) -----
// Wheel input is intercepted and eased toward a target offset each frame.
// Touch devices keep native scrolling, which already has momentum.
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = matchMedia('(pointer: coarse)').matches;

if (!prefersReducedMotion && !isCoarsePointer) {
  document.documentElement.style.scrollBehavior = 'auto';

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
  const clamp = (v) => Math.max(0, Math.min(v, maxScroll()));

  let target = window.scrollY;
  let current = target;
  let running = false;

  function frame() {
    const diff = target - current;
    if (Math.abs(diff) < 0.4) {
      current = target;
      window.scrollTo(0, current);
      running = false;
      return;
    }
    current += diff * 0.11; // easing factor — lower is slower/silkier
    window.scrollTo(0, current);
    requestAnimationFrame(frame);
  }

  function run() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return; // let pinch-zoom through
      const delta =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      e.preventDefault();
      target = clamp(target + delta);
      run();
    },
    { passive: false }
  );

  // resync when scrolled by any other means (scrollbar, keyboard, find-in-page)
  window.addEventListener(
    'scroll',
    () => {
      if (!running) {
        target = current = window.scrollY;
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', () => {
    target = clamp(target);
  });

  // in-page anchors ease to their target instead of jumping
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (!hash || hash === '#') return;
      const el = document.querySelector(hash);
      if (!el) return;
      e.preventDefault();
      target = clamp(el.getBoundingClientRect().top + window.scrollY - 72);
      run();
    });
  });
}

// ----- Drifting smoke behind the hero (WebGL) -----
// Wispy volumetric smoke that travels right to left and slowly changes shape,
// like the reference site. Falls back to the CSS blobs if WebGL is unavailable.
(function heroSmoke() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || prefersReducedMotion) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;

    vec2 hash(vec2 p) {
      // Lattice coordinates are wrapped before hashing. The smoke drifts forever,
      // so without this the inputs grow large enough to lose float precision and
      // the noise flattens out after a few minutes, fading the smoke away.
      p = mod(p, 289.0);
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      const float K1 = 0.366025404;
      const float K2 = 0.211324865;
      vec2 i = floor(p + (p.x + p.y) * K1);
      vec2 a = p - i + (i.x + i.y) * K2;
      float m = step(a.y, a.x);
      vec2 o = vec2(m, 1.0 - m);
      vec2 b = a - o + K2;
      vec2 c = a - 1.0 + 2.0 * K2;
      vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
      vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
      return dot(n, vec3(70.0));
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; i++) {   // 3 octaves keeps the wisps broad and soft
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

      float drift = u_time * 0.035;   // horizontal travel, right -> left, forever
      float morph = u_time * 0.012;   // slow change of shape along the way

      // sample point moves +x over time, so the smoke reads as moving left
      vec2 p = vec2(uv.x * 0.75 + drift, uv.y * 1.15);

      // domain warp gives the billowing, curling structure
      vec2 q = vec2(fbm(p * 0.40 + morph), fbm(p * 0.40 + vec2(3.4, 1.7) - morph));
      vec2 r = vec2(
        fbm(p * 0.40 + 1.4 * q + vec2(1.7, 9.2) + morph * 1.3),
        fbm(p * 0.40 + 1.4 * q + vec2(8.3, 2.8) - morph * 0.8)
      );
      float f = fbm(p * 0.40 + 1.54 * r);

      // carve wisps out of the field. The lower bound is negative so there is
      // always some smoke on screen rather than long empty stretches.
      float wisp = smoothstep(-0.22, 0.58, f);
      wisp *= smoothstep(0.95, 0.25, abs(uv.y) * 1.35);   // fade top and bottom
      float edge = smoothstep(1.15, 0.35, abs(uv.x) * 0.85); // fade left and right
      wisp *= edge;

      // faint warm cast so it sits with the gold accents instead of fighting them
      vec3 col = mix(vec3(0.90, 0.90, 0.92), vec3(0.98, 0.90, 0.74), pow(wisp, 3.0) * 0.4);

      // Cap the brightest wisps so a hot streak can never drift across the
      // headline and swallow it, then keep the overall level gentle.
      float alpha = min(wisp, 0.78) * 0.5;
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');

  const SCALE = 0.5; // soft effect, so half resolution is invisible and much cheaper
  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // hide the CSS fallback blobs now that the canvas is running
  canvas.parentElement.classList.add('canvas-active');
  canvas.classList.add('is-live');

  // The loop runs for as long as the page is open. Visibility is checked inside
  // the frame instead of by an observer, so the animation can never be left
  // switched off by an early "not intersecting" callback.
  const start = performance.now();

  function onScreen() {
    const r = canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function draw(now) {
    if (onScreen()) {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(draw); // always reschedule — the loop never ends
  }

  requestAnimationFrame(draw);
})();

// ----- Animated flowing-silk backdrop for the final CTA (WebGL) -----
// Domain-warped fractal noise, rendered on the GPU. Falls back silently to the
// static gradient underneath if WebGL is unavailable.
(function ctaSilk() {
  const canvas = document.getElementById('ctaCanvas');
  if (!canvas || prefersReducedMotion) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  const VERT = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      const float K1 = 0.366025404;
      const float K2 = 0.211324865;
      vec2 i = floor(p + (p.x + p.y) * K1);
      vec2 a = p - i + (i.x + i.y) * K2;
      float m = step(a.y, a.x);
      vec2 o = vec2(m, 1.0 - m);
      vec2 b = a - o + K2;
      vec2 c = a - 1.0 + 2.0 * K2;
      vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
      vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
      return dot(n, vec3(70.0));
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; i++) {   // 3 octaves keeps the folds broad, not marbled
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      uv.x *= 0.62;            // elongate horizontally into wide, sweeping drapes
      float t = u_time * 0.02;  // slow, silky drift (matches the reference's pace)

      // two rounds of domain warping produce the folded, silk-like drape
      vec2 q = vec2(fbm(uv * 0.42 + t), fbm(uv * 0.42 + vec2(5.2, 1.3) - t));
      vec2 r = vec2(
        fbm(uv * 0.42 + 2.2 * q + vec2(1.7, 9.2) + t * 1.05),
        fbm(uv * 0.42 + 2.2 * q + vec2(8.3, 2.8) - t * 0.9)
      );
      float f = fbm(uv * 0.42 + 2.2 * r);

      float v = smoothstep(-0.45, 0.85, f);
      vec3 col = mix(vec3(0.035), vec3(0.34), v);
      col += vec3(0.11) * pow(v, 4.0);                          // sheen on the folds
      col = mix(col, col * vec3(1.18, 1.02, 0.76), pow(v, 3.0) * 0.55); // warm gold cast

      float vig = smoothstep(1.35, 0.25, length(uv * vec2(0.75, 1.0)));
      col *= 0.45 + 0.55 * vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');

  // render at reduced resolution — the effect is soft, so it upscales invisibly
  const SCALE = 0.55;
  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // only animate while the section is on screen
  let visible = false;
  let rafId = null;
  const start = performance.now();

  function draw(now) {
    if (!visible) {
      rafId = null;
      return;
    }
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(draw);
  }

  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible && rafId === null) rafId = requestAnimationFrame(draw);
    },
    { threshold: 0 }
  ).observe(canvas);
})();

// ----- Vertical stat tickers: measure exact loop distance -----
// Each track holds two identical sets of cards. The loop travel must equal the
// pixel distance from set A's first card to set B's first card, or the restart
// point is visible as a jump/gap. Measured here and passed to CSS as --travel.
function sizeTickers() {
  document.querySelectorAll('.vticker__track').forEach((track) => {
    const kids = track.children;
    if (kids.length < 4) return;
    const setHeight = kids[kids.length / 2].offsetTop - kids[0].offsetTop;
    track.style.setProperty('--travel', `-${setHeight}px`);
  });
}
sizeTickers();
window.addEventListener('resize', sizeTickers);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeTickers);
window.addEventListener('load', sizeTickers);

// ----- Click-to-play YouTube embeds -----
document.querySelectorAll('.video-embed').forEach((embed) => {
  embed.addEventListener('click', () => {
    if (embed.querySelector('iframe')) return;
    const id = embed.dataset.videoId;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'YouTube video player';
    embed.appendChild(iframe);
  });
});

// ----- Featured work tabs -----
const workTabs = document.querySelectorAll('.work__tab');
const workCards = document.querySelectorAll('.work-card');
workTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    workTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
    const filter = tab.dataset.filter;
    workCards.forEach((card) => {
      card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.category !== filter);
    });
  });
});

// ----- FAQ accordion -----
document.querySelectorAll('.faq-item').forEach((item) => {
  const q = item.querySelector('.faq-item__q');
  const a = item.querySelector('.faq-item__a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');
    // close others
    document.querySelectorAll('.faq-item.is-open').forEach((other) => {
      other.classList.remove('is-open');
      other.querySelector('.faq-item__a').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('is-open');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});

// ----- Active nav link on scroll -----
const sections = ['top', 'offers', 'work', 'process', 'numbers', 'pricing', 'faq'];
const navAnchors = document.querySelectorAll('.nav__links a');
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navAnchors.forEach((a) => {
          a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
sections.forEach((id) => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

// ----- Mobile menu -----
const burger = document.getElementById('navBurger');
const links = document.getElementById('navLinks');
burger.addEventListener('click', () => links.classList.toggle('is-open'));
links.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => links.classList.remove('is-open'))
);
