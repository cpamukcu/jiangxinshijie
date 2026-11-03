/**
 * Contact form. GitHub Pages has no backend, so enquiries are posted to
 * FormSubmit (https://formsubmit.co), which emails them to CONTACT_EMAIL.
 * The very first submission makes FormSubmit send an activation link to that
 * inbox; nothing is delivered until it is clicked.
 * If the request fails for any reason, it falls back to opening the
 * visitor's email client with the message pre-filled via a mailto: link,
 * so no enquiry is lost.
 */
export function initContactForm() {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('contactFormNote');
  if (!form) return;

  const CONTACT_EMAIL = 'wukai@xsdecorate.cn';
  const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;
  const button = form.querySelector('button[type="submit"]');

  const collect = () => {
    const fields = [];
    let message = '';
    for (const el of form.elements) {
      if (!el.name || el.name.startsWith('_') || !el.value.trim()) continue;
      if (el.name === 'message') { message = el.value.trim(); continue; }
      const label = el.closest('label')?.childNodes[0]?.textContent.trim() || el.name;
      fields.push([label, el.value.trim()]);
    }
    return { fields, message };
  };

  const mailtoFallback = (name, { fields, message }) => {
    const subject = encodeURIComponent(`Website enquiry from ${name}`);
    const lines = fields.map(([label, value]) => `${label}: ${value}`);
    const body = encodeURIComponent(`${lines.join('\n')}\n\nMessage:\n${message}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    if (note) note.textContent = 'Your email client should now open — please send to complete your enquiry.';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements._honey?.value) return; // bot filled the hidden field

    const name = form.elements.name?.value.trim() || 'website visitor';
    const data = collect();
    const payload = Object.fromEntries(data.fields);
    payload.Message = data.message;
    payload._subject = `Website enquiry from ${name}`;
    payload._replyto = form.elements.email?.value.trim();
    payload._template = 'table';

    button.disabled = true;
    if (note) note.textContent = 'Sending…';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);
      form.reset();
      if (note) note.textContent = 'Thank you — your enquiry has been sent. We usually reply within two business days.';
    } catch {
      mailtoFallback(name, data);
    } finally {
      button.disabled = false;
    }
  });
}
