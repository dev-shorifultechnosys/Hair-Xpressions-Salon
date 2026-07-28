/* ========================================================================== 
   Hair Xpressions Salon — Contact Page Behaviour (V19)
   --------------------------------------------------------------------------
   The current website package is a static prototype, so this script validates
   the form and opens a prefilled email draft. For production, replace the
   mailto fallback inside submitContactForm() with the salon's CRM/form API.
   ========================================================================== */
(() => {
  'use strict';

  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const status = form.querySelector('.form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent || 'Send message';

  const setStatus = (message, type) => {
    if (!status) return;
    status.textContent = message;
    status.className = `form-status show ${type}`;
  };

  const submitContactForm = (event) => {
    event.preventDefault();

    // Honeypot: silently ignore bot submissions without exposing the field.
    const honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value.trim()) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Please complete all required fields.', 'error');
      return;
    }

    const data = new FormData(form);
    const destination = form.dataset.recipient || 'Angietron123@gmail.com';
    const name = String(data.get('name') || 'Website visitor').trim();
    const topic = String(data.get('topic') || 'General question').trim();
    const subject = `Hair Xpressions enquiry — ${topic} — ${name}`;
    const lines = [
      `Name: ${name}`,
      `Phone: ${data.get('phone') || ''}`,
      `Email: ${data.get('email') || ''}`,
      `Topic: ${topic}`,
      '',
      'Message:',
      String(data.get('message') || '').trim()
    ];

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Opening email…';
    }
    setStatus('Your email app is opening with the message ready to review and send.', 'success');

    const mailto = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.setTimeout(() => {
      window.location.href = mailto;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }, 260);
  };

  form.addEventListener('submit', submitContactForm);
})();
