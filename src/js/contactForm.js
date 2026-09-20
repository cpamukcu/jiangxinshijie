/**
 * Static contact form. There is no backend in this project, so submission
 * falls back to opening the visitor's email client with the message
 * pre-filled via a mailto: link.
 *
 * TODO: wire to a real form backend (e.g. https://formspree.io) — replace
 * this handler's mailto fallback with a fetch() POST once an endpoint exists.
 */
export function initContactForm() {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('contactFormNote');
  if (!form) return;

  const CONTACT_EMAIL = 'info@jiangxinshijie.com'; // TODO: replace with the real inbox

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const lines = [];
    let message = '';
    for (const el of form.elements) {
      if (!el.name || !el.value.trim()) continue;
      if (el.name === 'message') { message = el.value.trim(); continue; }
      const label = el.closest('label')?.childNodes[0]?.textContent.trim() || el.name;
      lines.push(`${label}: ${el.value.trim()}`);
    }
    const name = form.elements.name?.value || 'website visitor';
    const subject = encodeURIComponent(`Website enquiry from ${name}`);
    const body = encodeURIComponent(`${lines.join('\n')}\n\nMessage:\n${message}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    if (note) {
      note.textContent = 'Your email client should now open — please send to complete your enquiry.';
    }
  });
}
