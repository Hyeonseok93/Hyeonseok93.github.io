// Post page: toc highlight + reading progress, phone toc, code copy, image zoom, Rookies track position.
(() => {
  const root = document.documentElement;
  const progress = document.querySelector('[data-progress]');
  const toc = document.querySelector('[data-toc]');
  const heads = [...document.querySelectorAll('[data-prose] [id^="sec-"]')];

  const sections = toc ? [...toc.querySelectorAll('.ts')] : [];
  const subs = toc ? [...toc.querySelectorAll('.sub a')] : [];
  const list = toc?.querySelector('.toc-list');
  const pct = toc?.querySelector('[data-pct]');
  const bar = toc?.querySelector('[data-pg]');

  const onScroll = () => {
    const ratio = Math.min(1, root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight));
    if (progress) progress.style.width = `${ratio * 100}%`;
    if (!toc || !heads.length) return;
    if (pct) pct.textContent = `${Math.round(ratio * 100)}%`;
    if (bar) bar.style.width = `${ratio * 100}%`;

    // the last heading that has passed the upper quarter of the screen
    const line = innerHeight * 0.25;
    let cur = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top <= line) cur = h;
      else break;
    }
    const sec = sections.find((s) => s.dataset.id === cur.id) || sections.find((s) => s.querySelector(`a[href="#${cur.id}"]`)) || sections[0];
    sections.forEach((s) => {
      const on = s === sec;
      if (on && !s.classList.contains('on') && list) list.scrollTop = s.offsetTop - list.offsetTop - 40;
      s.classList.toggle('on', on);
    });
    subs.forEach((a) => a.classList.toggle('on', a.hash === `#${cur.id}`));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // phone toc closes after a jump
  const mtoc = document.querySelector('[data-mtoc]');
  mtoc?.addEventListener('click', (e) => { if (e.target.closest('a')) mtoc.open = false; });

  // copy buttons on code blocks
  document.querySelectorAll('.code .copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.code').querySelector('pre').innerText;
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = '복사됨';
      } catch {
        btn.textContent = '복사 실패';
      }
      setTimeout(() => { btn.textContent = '복사'; }, 1200);
    });
  });

  // click an article image to view it large
  const zoom = document.querySelector('[data-zoom]');
  const prose = document.querySelector('[data-prose]');
  if (zoom && prose) {
    const img = zoom.querySelector('img');
    prose.addEventListener('click', (e) => {
      if (e.target.tagName !== 'IMG') return;
      img.src = e.target.currentSrc || e.target.src;
      img.alt = e.target.alt;
      zoom.classList.add('on');
    });
    zoom.addEventListener('click', () => zoom.classList.remove('on'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zoom.classList.remove('on'); });
  }

  // phones: start the Rookies track row at this project
  const steps = document.querySelector('[data-steps]');
  const current = steps?.querySelector('[aria-current]');
  if (current && steps.scrollWidth > steps.clientWidth) steps.scrollLeft = current.offsetLeft - 16;
})();
