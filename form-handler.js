/*
 * TAJ HR Services — shared form submission handler.
 * Sends every enquiry/application form on this site as JSON to the AWS
 * Lambda backend, which relays it to info@tajhrservices.in via Titan Mail.
 * Include this file on every page that has a form:
 *     <script src="/form-handler.js"></script>
 * and mark each form with data-lambda-form, e.g.:
 *     <form data-lambda-form> ... </form>
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://kqshq7av3fcmcdf7wf7vy6ztji0vesax.lambda-url.ap-south-1.on.aws/';
  var THANKS_PAGE = '/thanks.html';

  function showError(form, message) {
    var box = form.querySelector('.form-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      box.style.color = '#b3261e';
      box.style.marginTop = '10px';
      box.style.fontSize = '0.95em';
      form.appendChild(box);
    }
    box.textContent = message;
    box.style.display = 'block';
  }

  function hideError(form) {
    var box = form.querySelector('.form-error');
    if (box) box.style.display = 'none';
  }

  function handleForm(form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        if (submitBtn.disabled) return; // guard against double-submit
        submitBtn.disabled = true;
        if (!submitBtn.dataset.originalText) {
          submitBtn.dataset.originalText = submitBtn.tagName === 'INPUT' ? submitBtn.value : submitBtn.textContent;
        }
        if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Sending…';
        else submitBtn.textContent = 'Sending…';
      }
      hideError(form);

      var data = {};
      new FormData(form).forEach(function (value, key) {
        data[key] = value;
      });

      function restoreButton() {
        if (!submitBtn) return;
        submitBtn.disabled = false;
        if (submitBtn.tagName === 'INPUT') submitBtn.value = submitBtn.dataset.originalText;
        else submitBtn.textContent = submitBtn.dataset.originalText;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () { return {}; })
            .then(function (json) { return { httpOk: res.ok, json: json }; });
        })
        .then(function (result) {
          if (result.httpOk && result.json && result.json.ok) {
            window.location.href = THANKS_PAGE;
          } else {
            restoreButton();
            showError(form, (result.json && result.json.error) || 'Something went wrong. Please try again or message us on WhatsApp.');
          }
        })
        .catch(function () {
          restoreButton();
          showError(form, 'Could not reach the server. Please check your connection and try again, or message us on WhatsApp.');
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form[data-lambda-form]');
    for (var i = 0; i < forms.length; i++) handleForm(forms[i]);
  });
})();
