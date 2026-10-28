/* ============================================================
   EXIT-INTENT POPUP
   Self-contained: injects its own styles and markup.
   To remove it completely: delete this file and delete the
   <script src="js/exit-popup.js"> line (marked EXIT-INTENT POPUP)
   at the bottom of index.html. Nothing else depends on it.

   Test it any time: open the site with ?exitpopup=1 on the end of
   the address, then move the mouse up out of the top of the window.
   ============================================================ */
(function () {
  'use strict';

  var SEEN_KEY = 'mh_exit_popup_seen';
  var force = /[?&]exitpopup=1/.test(location.search);

  function seen() { try { return sessionStorage.getItem(SEEN_KEY); } catch (e) { return null; } }
  function setSeen() { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }

  if (!force && seen()) return;
  // Anyone who already gave their email has no need for the offer.
  if (!force) { try { if (localStorage.getItem('mh_lead')) return; } catch (e) {} }
  // Touch screens have no "mouse leaving the page" signal, so this popup is desktop only.
  if (!force && window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

  var css =
    '.xd{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .3s ease}' +
    '.xd.is-open{opacity:1;pointer-events:auto}' +
    '.xd__box{position:relative;width:100%;max-width:460px;padding:38px 34px 30px;border-radius:18px;background:radial-gradient(circle at 15% 0%,rgba(255,180,51,.16),transparent 55%),#0a0a0a;border:1px solid rgba(255,180,51,.3);box-shadow:0 30px 80px rgba(0,0,0,.7);transform:translateY(14px) scale(.98);transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
    '.xd.is-open .xd__box{transform:none}' +
    '.xd__close{position:absolute;top:10px;right:14px;background:none;border:0;color:#bbb;font-size:28px;line-height:1;cursor:pointer}' +
    '.xd__close:hover{color:#fff}' +
    '.xd h3{margin-top:4px;font:300 28px/1.2 var(--serif,serif);color:#fff}' +
    '.xd p{margin-top:10px;color:rgba(255,255,255,.72);font-size:15px}' +
    '.xd form{margin-top:20px;display:grid;gap:12px}' +
    '.xd select,.xd input[type=email]{width:100%;font:15px var(--sans,sans-serif);color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:13px 14px}' +
    '.xd select option{color:#000}' +
    '.xd input:focus,.xd select:focus{outline:none;border-color:#ffb433;box-shadow:0 0 0 3px rgba(255,180,51,.18)}' +
    '.xd .btn{width:100%;text-align:center;border:0;cursor:pointer}' +
    '.xd .btn:disabled{opacity:.6;cursor:wait}' +
    '.xd__status{min-height:18px;font-size:13px;margin:0!important}' +
    '.xd__status.is-error{color:#ff8a8a}.xd__status.is-ok{color:#12b669}' +
    '.xd__hp{position:absolute!important;left:-9999px!important;opacity:0!important}';

  var style = document.createElement('style');
  style.setAttribute('data-exit-popup', '');
  style.textContent = css;
  document.head.appendChild(style);

  var el = document.createElement('div');
  el.className = 'xd';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Free playbook before you go');
  el.setAttribute('data-exit-popup', '');
  el.innerHTML =
    '<div class="xd__box">' +
    '<button type="button" class="xd__close" aria-label="Close">&times;</button>' +
    '<h3>Before you go, grab a free playbook</h3>' +
    '<p>Pick your niche and we&rsquo;ll send you the exact content plan. Free, no strings.</p>' +
    '<form novalidate>' +
    '<select name="slug" aria-label="Your niche">' +
    '<option value="business-coach">Business Coach playbook</option>' +
    '<option value="course-creator">Course Creator playbook</option>' +
    '</select>' +
    '<input type="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email" required />' +
    '<input type="text" name="website" class="xd__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
    '<button type="submit" class="btn">Send me the playbook</button>' +
    '<p class="xd__status" role="status" aria-live="polite"></p>' +
    '</form></div>';
  document.body.appendChild(el);

  var form = el.querySelector('form');
  var status = el.querySelector('.xd__status');
  var btn = el.querySelector('.btn');

  function open() {
    if (el.classList.contains('is-open')) return;
    if (!force && seen()) return;
    el.classList.add('is-open');
    setSeen();
    if (window.MHLeads) window.MHLeads.track('exit_popup_shown');
  }
  function close() { el.classList.remove('is-open'); }

  // Mouse leaves through the top edge of the window = heading for tabs / address bar / close.
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && e.clientY <= 0) open();
  });
  el.querySelector('.xd__close').addEventListener('click', close);
  el.addEventListener('click', function (e) { if (e.target === el) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var L = window.MHLeads;
    var email = form.elements.email.value.trim();
    var slug = form.elements.slug.value;
    if (!L || !L.validEmail(email)) {
      status.textContent = 'Please enter a valid email address.';
      status.className = 'xd__status is-error';
      return;
    }
    if (form.elements.website.value) { close(); return; }
    btn.disabled = true;
    btn.textContent = 'Sending…';
    L.sendToKit({
      email: email,
      fields: { playbook: L.playbooks[slug] || slug, playbook_slug: slug, source: 'exit-intent-popup' }
    }).then(function () {
      L.markLead(email);
      L.track('exit_popup_signup');
      status.textContent = 'Done. Your download is starting.';
      status.className = 'xd__status is-ok';
      L.downloadPlaybook(slug);
      setTimeout(close, 1500);
    }).catch(function () {
      status.textContent = 'Something went wrong. Please try again.';
      status.className = 'xd__status is-error';
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Send me the playbook';
    });
  });
})();
