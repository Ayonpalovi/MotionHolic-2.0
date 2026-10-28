/* ============================================================
   Motionholic — lead capture
   Sends emails and contact-form messages straight to Kit
   (form "Newsletter site", id 10044687). No server needed.
   Everything lands in Kit > Subscribers, with these custom
   fields: playbook, playbook_slug, source, business, message.
   ============================================================ */
(function () {
  'use strict';

  var KIT_FORM_ID = '10044687';
  var KIT_URL = 'https://app.kit.com/forms/' + KIT_FORM_ID + '/subscriptions';
  var STORE_KEY = 'mh_lead';

  var PLAYBOOKS = {
    'business-coach': 'Business Coach',
    'course-creator': 'Course Creator',
    'fitness-coach': 'Fitness Coach'
  };

  // ----- helpers -----
  function track(name) {
    try { if (window.clarity) window.clarity('event', name); } catch (e) {}
    try { if (window.gtag) window.gtag('event', name); } catch (e) {}
  }
  function markLead(email) {
    try { if (window.clarity) window.clarity('set', 'lead', 'true'); } catch (e) {}
    try { localStorage.setItem(STORE_KEY, email); } catch (e) {}
  }
  function knownLead() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  // POST to Kit. data: { email, name, fields: {key: value} }. Resolves on success.
  function sendToKit(data) {
    var body = new FormData();
    body.append('email_address', data.email);
    if (data.name) body.append('first_name', data.name);
    Object.keys(data.fields || {}).forEach(function (k) {
      if (data.fields[k]) body.append('fields[' + k + ']', data.fields[k]);
    });
    return fetch(KIT_URL, {
      method: 'POST',
      body: body,
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('Kit responded ' + res.status);
      return res;
    });
  }

  function downloadPlaybook(slug) {
    var a = document.createElement('a');
    a.href = 'assets/playbooks/motionholic-' + slug + '-playbook.pdf';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Exposed so the exit-intent popup (and anything else) can reuse the same pipe.
  window.MHLeads = {
    sendToKit: sendToKit,
    track: track,
    markLead: markLead,
    validEmail: validEmail,
    downloadPlaybook: downloadPlaybook,
    knownLead: knownLead,
    playbooks: PLAYBOOKS
  };

  // ============ 1. Playbook download gate ============
  (function () {
    var btn = document.getElementById('pbxDownload');
    if (!btn) return;

    var modal = document.createElement('div');
    modal.className = 'lead-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'leadModalTitle');
    modal.hidden = true;
    modal.innerHTML =
      '<div class="lead-modal__box">' +
      '<button type="button" class="lead-modal__close" aria-label="Close">&times;</button>' +
      '<span class="lead-modal__eyebrow">Free download</span>' +
      '<h3 id="leadModalTitle">Where should we send it?</h3>' +
      '<p class="lead-modal__sub">Enter your details and the <strong id="leadModalName"></strong> playbook downloads instantly.</p>' +
      '<form class="lead-form" novalidate>' +
      '<label class="lead-field"><span>First name</span><input type="text" name="name" autocomplete="given-name" placeholder="Your name" /></label>' +
      '<label class="lead-field"><span>Email</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" required /></label>' +
      '<input type="text" name="website" class="lead-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
      '<button type="submit" class="btn lead-form__btn">Download the playbook</button>' +
      '<p class="lead-form__status" role="status" aria-live="polite"></p>' +
      '<p class="lead-form__fine">No spam. Unsubscribe any time. See our <a href="privacy.html">privacy policy</a>.</p>' +
      '</form></div>';
    document.body.appendChild(modal);

    var form = modal.querySelector('form');
    var status = modal.querySelector('.lead-form__status');
    var submit = modal.querySelector('.lead-form__btn');
    var nameEl = modal.querySelector('#leadModalName');
    var closeBtn = modal.querySelector('.lead-modal__close');
    var lastFocus = null;

    function currentSlug() {
      var m = /motionholic-(.+)-playbook\.pdf/.exec(btn.getAttribute('href') || '');
      return m ? m[1] : 'business-coach';
    }
    function open() {
      var slug = currentSlug();
      nameEl.textContent = PLAYBOOKS[slug] || slug;
      status.textContent = '';
      status.className = 'lead-form__status';
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('lead-modal-open');
      setTimeout(function () { form.elements.name.focus(); }, 30);
      track('playbook_gate_open');
    }
    function close() {
      modal.hidden = true;
      document.body.classList.remove('lead-modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var slug = currentSlug();
      if (knownLead()) {            // already gave their email: just download
        downloadPlaybook(slug);
        track('playbook_download');
        return;
      }
      open();
    });
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.elements.email.value.trim();
      var name = form.elements.name.value.trim();
      if (!validEmail(email)) {
        status.textContent = 'Please enter a valid email address.';
        status.className = 'lead-form__status is-error';
        form.elements.email.focus();
        return;
      }
      var slug = currentSlug();
      if (form.elements.website.value) {   // honeypot tripped: pretend success
        downloadPlaybook(slug);
        close();
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Sending…';
      sendToKit({
        email: email,
        name: name,
        fields: { playbook: PLAYBOOKS[slug] || slug, playbook_slug: slug, source: 'playbook-download' }
      }).then(function () {
        markLead(email);
        track('playbook_download');
        status.textContent = 'Done. Your download is starting.';
        status.className = 'lead-form__status is-ok';
        downloadPlaybook(slug);
        setTimeout(close, 1400);
      }).catch(function () {
        status.innerHTML = 'Something went wrong. Please try again, or email <a href="mailto:ayonpalovi10@gmail.com">ayonpalovi10@gmail.com</a>.';
        status.className = 'lead-form__status is-error';
      }).then(function () {
        submit.disabled = false;
        submit.textContent = 'Download the playbook';
      });
    });
  })();

  // ============ 2. Contact form (bottom of the page) ============
  (function () {
    var form = document.getElementById('contactForm');
    if (!form) return;
    var status = form.querySelector('.lead-form__status');
    var submit = form.querySelector('.lead-form__btn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var business = form.elements.business.value.trim();
      var message = form.elements.message.value.trim();

      if (!name || !validEmail(email) || !message) {
        status.textContent = 'Please add your name, a valid email and a short message.';
        status.className = 'lead-form__status is-error';
        return;
      }
      if (form.elements.website.value) {   // honeypot
        status.textContent = 'Thanks! We will be in touch within 1 business day.';
        status.className = 'lead-form__status is-ok';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Sending…';
      sendToKit({
        email: email,
        name: name,
        fields: { source: 'contact-form', business: business, message: message }
      }).then(function () {
        markLead(email);
        track('contact_form_submit');
        form.reset();
        status.textContent = 'Thanks! We got your message and will reply within 1 business day.';
        status.className = 'lead-form__status is-ok';
      }).catch(function () {
        status.innerHTML = 'Something went wrong. Please email us directly at <a href="mailto:ayonpalovi10@gmail.com">ayonpalovi10@gmail.com</a>.';
        status.className = 'lead-form__status is-error';
      }).then(function () {
        submit.disabled = false;
        submit.textContent = 'Send message';
      });
    });
  })();
})();
