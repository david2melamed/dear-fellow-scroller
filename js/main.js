import { SITE } from './config.js';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const behavior = () => motion.matches ? 'instant' : 'smooth';
$$('[data-text]').forEach(el => { if (SITE[el.dataset.text] !== undefined) el.textContent = SITE[el.dataset.text]; });
$$('[data-link]').forEach(el => { if (SITE[el.dataset.link]) el.href = SITE[el.dataset.link]; });
$$('[data-subscribe]').forEach(el => { el.href = `${SITE.substackPublication.replace(/\/$/, '')}/subscribe`; });
$$('[data-social]').forEach(el => { if (SITE.socials[el.dataset.social]) el.href = SITE.socials[el.dataset.social]; });
const joined = Math.max(0, Math.floor(Number(SITE.writersJoined) || 0));
const goal = Math.max(1, Math.floor(Number(SITE.writersGoal) || 10));
$$('[data-goal]').forEach(el => { el.textContent = goal; });
$$('[data-count]').forEach(el => { el.textContent = joined; });
$$('.progress').forEach(el => {
  el.setAttribute('aria-valuemax', goal);
  el.setAttribute('aria-valuenow', Math.min(joined, goal));
  el.setAttribute('aria-valuetext', `${joined} of ${goal} founding writers`);
  $('span', el).style.width = `${Math.min(100, joined / goal * 100)}%`;
});
$$('.segments').forEach(el => {
  el.replaceChildren(...Array.from({ length: Math.min(goal, 100) }, (_, i) => {
    const segment = document.createElement('span');
    if (i < joined) segment.className = 'filled';
    return segment;
  }));
});
const countObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  countObserver.unobserve(entry.target);
  if (motion.matches) return;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / 850);
    entry.target.textContent = Math.round(joined * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}), { threshold: .5 });
$$('[data-count]').forEach(el => countObserver.observe(el));
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('visible');
  revealObserver.unobserve(entry.target);
}), { threshold: .08 });
if (!motion.matches) $$('[data-reveal]').forEach(el => { el.classList.add('reveal-ready'); revealObserver.observe(el); });
motion.addEventListener('change', () => { if (motion.matches) $$('.reveal-ready').forEach(el => el.classList.add('visible')); });

const menu = $('.menu-toggle');
const nav = $('#nav-links');
function closeMenu() {
  if (!menu) return;
  menu.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
  document.body.style.overflow = '';
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) $('a', nav).focus();
});
nav?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', e => {
  if (menu?.getAttribute('aria-expanded') !== 'true') return;
  if (e.key === 'Escape') { closeMenu(); menu.focus(); }
  if (e.key === 'Tab') {
    const items = [menu, ...$$('a', nav)];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items.at(-1).focus(); }
    if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); menu.focus(); }
  }
});
matchMedia('(min-width: 701px)').addEventListener('change', closeMenu);

const shell = $('#join-form');
const form = $('form[name="founding-writers"]');
let sending = false;
if (form) {
  form.noValidate = true;
  shell.hidden = true;
  const name = $('#writer-name');
  const email = $('#writer-email');
  const submit = $('button[type="submit"]', form);
  function openJoin(focus = true) {
    const wasHidden = shell.hidden;
    shell.hidden = false;
    if (wasHidden && !motion.matches) {
      const expandedHeight = shell.offsetHeight;
      shell.style.overflow = 'hidden';
      const opening = shell.animate([{ height: '0px', opacity: 0 }, { height: `${expandedHeight}px`, opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
      opening.onfinish = () => { shell.style.overflow = ''; };
    }
    if (focus) {
      const target = form.hidden ? $('.success-state') : name;
      target.focus({ preventScroll: true });
      shell.scrollIntoView({ behavior: behavior(), block: 'center' });
    }
  }
  $$('[data-join]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault(); closeMenu();
    history.replaceState(null, '', '#join');
    openJoin();
  }));
  function checkHash() { if (location.hash === '#join' || location.hash === '#join-form') openJoin(); }
  addEventListener('hashchange', checkHash);
  checkHash();
  [name, email].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $(`#${input === name ? 'name' : 'email'}-error`).textContent = '';
    $('#send-error').textContent = '';
  }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    let firstInvalid;
    [[name, !name.value.trim() || name.value.trim().length > 40, 'Enter a first name or nickname (up to 40 characters).', 'name-error'],
      [email, !email.validity.valid, 'Enter your email so we can reach you.', 'email-error']].forEach(([input, invalid, message, id]) => {
      $(`#${id}`).textContent = invalid ? message : '';
      input.setAttribute('aria-invalid', String(invalid));
      if (invalid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }
    if (location.protocol === 'file:') {
      $('#send-error').textContent = 'The form works after this site is deployed to Netlify. Your details have not been sent.';
      return;
    }
    sending = true; submit.disabled = true; submit.textContent = 'Sending…';
    $('#send-error').textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const data = new FormData(form);
      data.set('name', name.value.trim());
      const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data), signal: controller.signal });
      if (!response.ok) throw new Error('Submission failed');
      $('#success-name').textContent = name.value.trim();
      form.hidden = true;
      const success = $('.success-state');
      success.hidden = false;
      if (!motion.matches) success.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: behavior(), block: 'center' });
    } catch {
      $('#send-error').textContent = 'Couldn’t send. Check your connection and try again.';
    } finally {
      clearTimeout(timeout); sending = false; submit.disabled = false; submit.textContent = 'Join the team';
    }
  });
}
const subscribe = $('.subscribe-form');
if (subscribe) {
  subscribe.action = `${SITE.substackPublication.replace(/\/$/, '')}/subscribe`;
  subscribe.noValidate = true;
  const email = $('input[type="email"]', subscribe);
  subscribe.addEventListener('submit', e => {
    if (!email.validity.valid) {
      e.preventDefault(); email.setAttribute('aria-invalid', 'true');
      $('#subscribe-error').textContent = 'Enter a valid email address to subscribe.'; email.focus();
    }
    // A native GET in a new tab preserves user activation and safely encodes the email.
  });
  email.addEventListener('input', () => { email.removeAttribute('aria-invalid'); $('#subscribe-error').textContent = ''; });
}
const video = $('#video');
if (video && /^[A-Za-z0-9_-]{11}$/.test(SITE.youtubeLatestVideoId)) {
  video.hidden = false;
  $('#load-video').addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${SITE.youtubeLatestVideoId}?autoplay=1`;
    iframe.title = 'Dear Fellow Scroller — latest video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    $('.video-facade').replaceChildren(iframe);
  }, { once: true });
}
