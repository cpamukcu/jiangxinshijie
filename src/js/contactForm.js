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
    const data = new FormData(form);
    const name = (data.get('name') || '').toString();
    const phone = (data.get('phone') || '').toString();
    const message = (data.get('message') || '').toString();

    const subject = encodeURIComponent(`Website enquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone}\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    if (note) {
      note.textContent = 'Your email client should now open — please send to complete your enquiry.';
    }
  });
}
