const section = document.querySelector('#intro');
if (section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 700px)');
  const body = document.body;
  const scene = section.querySelector('.feed-scene');
  const phone = section.querySelector('.phone-main');
  const light = section.querySelector('.intro-light');
  const letter = section.querySelector('.intro-letter');
  const typed = section.querySelector('.typed');
  const caret = section.querySelector('.caret');
  const hud = section.querySelector('.intro-hud');
  const prompt = section.querySelector('.keep-scrolling');
  const badge = section.querySelector('.feed-badge');
  const live = section.querySelector('.live-badge');
  const elapsed = section.querySelector('[data-elapsed]');
  const unread = section.querySelector('[data-unread]');
  const target = document.querySelector('.salutation');
  const phrase = 'Dear Fellow Scroller,';
  const pool = [];
  let frame = 0, visible = false, last = 0, offset = 0, hookOffset = 0, tick = 0, bounds;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  section.querySelectorAll('.feed-track').forEach((track, column) => {
    const length = column === 0 ? 8 : 4;
    for (let i = 0; i < length; i++) {
      const card = document.createElement('div');
      card.className = 'feed-card';
      card.innerHTML = `<div class="feed-person"><span class="avatar"></span><span>@user_${48213 + column * 1427 + i * 137}</span></div><div class="feed-media"></div><div class="engagement"><span>♡ <b>12.4K</b></span><span>◯ 284</span><span>↗</span></div>`;
      track.append(card);
      pool.push({ card, number: card.querySelector('b'), index: i, length, column });
    }
  });
  body.classList.add('intro-active');
  function measure() {
    const box = section.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    bounds = { top: box.top + scrollY, range: section.offsetHeight - innerHeight,
      width: innerWidth, height: innerHeight, x: destination.left,
      y: destination.top + scrollY,
      fontRatio: parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(letter).fontSize) };
    // One measure on resize/font readiness; no layout reads in scroll handlers or frames.
    bounds.textWidth = letter.offsetWidth;
  }
  function render(now) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    const dt = Math.min(50, now - (last || now)); last = now;
    const p = clamp((scrollY - bounds.top) / Math.max(1, bounds.range));
    const slow = ease((p - .12) / .33);
    const dissolve = ease((p - .45) / .25);
    const handoff = ease((p - .90) / .10);
    if (p <= .12) {
      offset += dt * .57 * (1 + .17 * Math.sin(now / 620));
      hookOffset = offset;
    } else {
      // Integrating a decelerating curve gives a deterministic, reversible distance.
      const q = clamp((p - .12) / .33);
      offset = hookOffset + 850 * (1 - (1 - q) ** 3);
    }
    const fade = 1 - dissolve;
    scene.style.opacity = fade;
    scene.style.filter = `saturate(${1 - slow})`;
    phone.style.transform = `translate(-50%,-50%) scale(${1 + dissolve * .08})`;
    light.style.opacity = ease((p - .45) / .27);
    for (const item of pool) {
      const travel = offset * (item.column === 0 ? 1 : item.column === 1 ? .68 : .85);
      const span = item.length * 324;
      const y = ((item.index * 324 - travel) % span + span) % span - 324;
      const drift = (y - 200) * dissolve * .22;
      item.card.style.transform = `translateY(${y + drift}px)`;
      item.card.style.opacity = 1 - clamp(dissolve * (1 + Math.abs(y - 200) / 1000));
    }
    hud.style.opacity = 1 - slow;
    badge.style.opacity = (1 - slow) * (p <= .12 ? .8 + .2 * Math.sin(now / 900) : 1);
    live.style.opacity = 1 - slow;
    prompt.style.opacity = 1 - ease(p / .25);
    if (p <= .12 && now - tick > 450) {
      tick = now;
      const seconds = Math.floor(offset / 60);
      elapsed.textContent = `00:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      unread.textContent = Math.floor(offset / 220) + 3;
      pool.forEach((item, i) => { item.number.textContent = `${(12.4 + offset / 19000 + i / 10).toFixed(1)}K`; });
    }
    const length = Math.round(phrase.length * clamp((p - .70) / .20));
    const text = phrase.slice(0, length);
    if (typed.textContent !== text) typed.textContent = text;
    letter.style.opacity = p >= .70 && p < .999 ? '1' : '0';
    const scale = 1 + (bounds.fontRatio - 1) * handoff;
    const startX = (bounds.width - bounds.textWidth) / 2;
    const startY = bounds.height * .45;
    const x = startX + (bounds.x - startX) * handoff;
    const y = startY + (bounds.y - scrollY - startY) * handoff;
    letter.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    letter.style.left = '0'; letter.style.top = '0';
    caret.style.opacity = p >= .9 ? 1 - handoff : (Math.sin(now / 550) > 0 ? 1 : .2);
    body.style.setProperty('--handoff', handoff);
    body.style.setProperty('--salutation', p >= .999 ? 1 : 0);
    body.style.setProperty('--nav-events', p >= .95 ? 'auto' : 'none');
    body.classList.toggle('intro-finished', p >= 1);
    // Outside the hook, only the caret needs a timer. Other phases wake on scroll.
    if (p <= .12 || (p >= .70 && p < .9)) frame = requestAnimationFrame(render);
  }
  function wake() {
    if (!frame && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(render);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (scrollY > bounds.top) {
        body.style.setProperty('--handoff', 1); body.style.setProperty('--salutation', 1); body.style.setProperty('--nav-events', 'auto');
      }
    } else wake();
  });
  measure(); observer.observe(section);
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { measure(); wake(); }, { passive: true });
  document.fonts.ready.then(() => { measure(); wake(); });
  document.addEventListener('visibilitychange', () => {
    last = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake();
  });
  function setMotion() {
    cancelAnimationFrame(frame); frame = 0;
    if (reduced.matches) {
      pool.forEach(item => { item.card.style.transform = `translateY(${item.index * 324}px)`; item.card.style.opacity = 1; });
      scene.style.opacity = ''; scene.style.filter = '';
    }
    measure(); wake();
  }
  reduced.addEventListener('change', setMotion); setMotion();
  // Restore incoming section links after the progressive intro changes document height.
  if (['#hero', '#about', '#letter', '#join', '#join-form', '#subscribe'].includes(location.hash)) {
    requestAnimationFrame(() => {
      const anchor = document.querySelector(location.hash === '#join' ? '#join-form' : location.hash);
      anchor?.scrollIntoView({ behavior: 'instant', block: 'start' });
      wake();
    });
  }
  document.querySelector('.skip').addEventListener('click', () => {
    body.style.setProperty('--handoff', 1); body.style.setProperty('--salutation', 1); body.style.setProperty('--nav-events', 'auto');
    document.querySelector('#hero').focus({ preventScroll: true });
  });
}
