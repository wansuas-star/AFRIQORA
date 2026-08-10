const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const year = document.getElementById('year');
const form = document.getElementById('enquiry-form');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = data.get('name')?.toString() || 'there';
    const email = data.get('email')?.toString() || '';
    const service = data.get('service')?.toString() || 'Website strategy';
    const message = data.get('message')?.toString() || '';

    const subject = encodeURIComponent(`AFRIQORA enquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`
    );

    window.location.href = `https://wa.me/+27781261611?text=${encodeURIComponent(`Hello AFRIQORA, I would like to discuss my website and lead generation needs.\n\nName: ${name}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`)}`;
    form.reset();
  });
}
