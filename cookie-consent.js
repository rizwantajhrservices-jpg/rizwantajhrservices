/* ==========================================================================
   TAJ HR Services — cookie consent
   Vanilla JavaScript, no dependencies, GitHub Pages compatible.

   WHAT THIS SITE ACTUALLY DOES TODAY
   ----------------------------------
   At the time of writing, tajhrservices.in sets no cookies of its own and
   uses no analytics, advertising or tracking scripts. This system therefore
   does two things:
     1. tells visitors that plainly, and records their preference;
     2. provides a working consent gate so that IF analytics or marketing
        tools are ever added, they can be loaded only after consent.

   HOW TO ADD ANALYTICS LATER (do not load tags directly in the page):
     window.addEventListener('cc:consent', function (e) {
       if (e.detail.analytics) { // inject your analytics tag here }
       if (e.detail.marketing) { // inject your marketing tag here }
     });
     // and check the current state at any time with:
     //   window.TAJ_CONSENT.get()   ->  {necessary, analytics, marketing} | null
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'tajhr_cookie_consent_v1';
  var POLICY_URL  = '/privacy-policy';

  /* ----------------------------------------------------------------------
     storage — wrapped because private browsing can throw on access
     ---------------------------------------------------------------------- */
  function readConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || typeof v !== 'object') return null;
      return {
        necessary: true,
        analytics: v.analytics === true,
        marketing: v.marketing === true,
        decidedAt: v.decidedAt || null
      };
    } catch (err) {
      return null;
    }
  }

  function writeConsent(analytics, marketing) {
    var value = {
      necessary: true,
      analytics: analytics === true,
      marketing: marketing === true,
      decidedAt: new Date().toISOString(),
      version: 1
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (err) {
      /* private mode or storage disabled: the choice applies to this page
         session only, which is the correct fallback rather than an error */
    }
    return value;
  }

  function announce(value) {
    try {
      window.dispatchEvent(new CustomEvent('cc:consent', { detail: value }));
    } catch (err) {
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('cc:consent', false, false, value);
      window.dispatchEvent(ev);
    }
  }

  /* ----------------------------------------------------------------------
     markup
     ---------------------------------------------------------------------- */
  var root, banner, overlay, panel, fab, lastFocus = null;

  function build() {
    root = document.createElement('div');
    root.className = 'cc-root';

    root.innerHTML = [
      '<section class="cc-banner" id="cc-banner" role="region"',
      '  aria-label="Privacy and cookies" hidden>',
      '  <div class="cc-banner-in">',
      '    <div class="cc-copy">',
      '      <h2>Privacy &amp; cookies</h2>',
      '      <p>This website does not set advertising or analytics cookies. It loads',
      '        typefaces from Google Fonts and processes enquiry forms through Formspree,',
      '        which means those providers receive technical data such as your IP address.',
      '        You can choose what you allow, and change it at any time. See our',
      '        <a href="' + POLICY_URL + '">Privacy Policy</a> for detail.</p>',
      '    </div>',
      '    <div class="cc-actions">',
      '      <button type="button" class="cc-btn cc-btn-primary" data-cc="accept">Accept all</button>',
      '      <button type="button" class="cc-btn cc-btn-secondary" data-cc="reject">Reject non-essential</button>',
      '      <button type="button" class="cc-btn cc-btn-link" data-cc="manage">Manage preferences</button>',
      '    </div>',
      '  </div>',
      '</section>',

      '<div class="cc-overlay" id="cc-overlay" hidden>',
      '  <div class="cc-panel" role="dialog" aria-modal="true"',
      '       aria-labelledby="cc-panel-title" aria-describedby="cc-panel-desc">',
      '    <div class="cc-panel-head">',
      '      <div>',
      '        <h2 id="cc-panel-title">Cookie preferences</h2>',
      '        <p id="cc-panel-desc">Choose what this website is allowed to use. Necessary items',
      '          cannot be switched off because the site will not work without them.</p>',
      '      </div>',
      '      <button type="button" class="cc-close" data-cc="close" aria-label="Close cookie preferences">&times;</button>',
      '    </div>',

      '    <div class="cc-panel-body">',
      '      <div class="cc-cat">',
      '        <div class="cc-cat-top">',
      '          <h3>Necessary</h3>',
      '          <span class="cc-always">Always on</span>',
      '        </div>',
      '        <p>Required for the website to function and for your cookie choice to be',
      '          remembered. This includes the typefaces loaded from Google Fonts and the',
      '          form service used to send us your enquiry. No tracking or profiling is',
      '          carried out through these.</p>',
      '      </div>',

      '      <div class="cc-cat">',
      '        <div class="cc-cat-top">',
      '          <h3><label for="cc-analytics">Analytics</label></h3>',
      '          <span class="cc-switch">',
      '            <input type="checkbox" id="cc-analytics" aria-describedby="cc-analytics-desc">',
      '            <span class="cc-track" aria-hidden="true"></span>',
      '          </span>',
      '        </div>',
      '        <p id="cc-analytics-desc">Would allow us to measure how pages are used so we can',
      '          improve them. <strong>We do not currently use any analytics tool on this',
      '          website.</strong> If we add one, this switch will control it.</p>',
      '      </div>',

      '      <div class="cc-cat">',
      '        <div class="cc-cat-top">',
      '          <h3><label for="cc-marketing">Marketing</label></h3>',
      '          <span class="cc-switch">',
      '            <input type="checkbox" id="cc-marketing" aria-describedby="cc-marketing-desc">',
      '            <span class="cc-track" aria-hidden="true"></span>',
      '          </span>',
      '        </div>',
      '        <p id="cc-marketing-desc">Would allow advertising or remarketing tools to record your',
      '          visit. <strong>We do not currently use any advertising or remarketing tool on this',
      '          website.</strong> If we add one, this switch will control it.</p>',
      '      </div>',
      '    </div>',

      '    <p class="cc-note">Your choice is stored in this browser only. Clearing your browser',
      '      data will reset it. Full detail is in our <a href="' + POLICY_URL + '">Privacy Policy</a>.</p>',

      '    <div class="cc-panel-foot">',
      '      <button type="button" class="cc-btn cc-btn-secondary" data-cc="reject">Reject non-essential</button>',
      '      <button type="button" class="cc-btn cc-btn-secondary" data-cc="accept">Accept all</button>',
      '      <button type="button" class="cc-btn cc-btn-primary" data-cc="save">Save my choices</button>',
      '    </div>',
      '  </div>',
      '</div>',

      '<button type="button" class="cc-fab" id="cc-fab" data-cc="manage" hidden',
      '        aria-label="Open cookie settings">',
      '  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      '    <circle cx="12" cy="12" r="9"></circle>',
      '    <circle cx="9.5" cy="10" r="1.1"></circle>',
      '    <circle cx="14.5" cy="9.5" r="1.1"></circle>',
      '    <circle cx="10" cy="15" r="1.1"></circle>',
      '    <circle cx="15" cy="14.5" r="1.1"></circle>',
      '  </svg>',
      '  <span class="cc-fab-label">Cookie settings</span>',
      '</button>'
    ].join('\n');

    document.body.appendChild(root);

    banner  = root.querySelector('#cc-banner');
    overlay = root.querySelector('#cc-overlay');
    panel   = overlay.querySelector('.cc-panel');
    fab     = root.querySelector('#cc-fab');
  }

  /* ----------------------------------------------------------------------
     panel focus handling
     ---------------------------------------------------------------------- */
  function focusables() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('button, input, a[href]')
    ).filter(function (el) { return el.offsetParent !== null || el.type === 'checkbox'; });
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    var list = focusables();
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onKey(e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { closePanel(); return; }
    trapTab(e);
  }

  function openPanel() {
    var c = readConsent();
    root.querySelector('#cc-analytics').checked = !!(c && c.analytics);
    root.querySelector('#cc-marketing').checked = !!(c && c.marketing);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    banner.hidden = true;
    var f = focusables();
    if (f.length) f[0].focus();
  }

  function closePanel() {
    overlay.hidden = true;
    if (!readConsent()) { banner.hidden = false; }
    else { fab.hidden = false; }
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus(); } catch (err) {}
    }
    lastFocus = null;
  }

  /* ----------------------------------------------------------------------
     decisions
     ---------------------------------------------------------------------- */
  function decide(analytics, marketing) {
    var value = writeConsent(analytics, marketing);
    banner.hidden = true;
    overlay.hidden = true;
    fab.hidden = false;
    announce(value);
  }

  function wire() {
    root.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-cc]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-cc');

      if (action === 'accept')       decide(true, true);
      else if (action === 'reject')  decide(false, false);
      else if (action === 'manage')  openPanel();
      else if (action === 'close')   closePanel();
      else if (action === 'save') {
        decide(root.querySelector('#cc-analytics').checked,
               root.querySelector('#cc-marketing').checked);
      }
    });

    /* clicking the dimmed area closes the panel */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePanel();
    });

    document.addEventListener('keydown', onKey);

    /* any element on any page with data-cc="manage" reopens the panel,
       which is what the footer "Cookie settings" link uses */
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-cc="manage"]') : null;
      if (el && !root.contains(el)) { e.preventDefault(); openPanel(); }
    });
  }

  /* ----------------------------------------------------------------------
     public API
     ---------------------------------------------------------------------- */
  window.TAJ_CONSENT = {
    get: readConsent,
    open: function () { openPanel(); },
    reset: function () {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) {}
      fab.hidden = true;
      overlay.hidden = true;
      banner.hidden = false;
    }
  };

  /* ----------------------------------------------------------------------
     init
     ---------------------------------------------------------------------- */
  function init() {
    if (!document.body) return;
    build();
    wire();

    var existing = readConsent();
    if (existing) {
      fab.hidden = false;
      announce(existing);
    } else {
      banner.hidden = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
