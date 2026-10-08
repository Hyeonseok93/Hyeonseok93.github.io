// Rookies log list: highlight the phase on screen in the left (or top, on phones) phase list.
(() => {
  const toc = document.querySelector('[data-ltoc]');
  if (!toc) return;
  const links = [...toc.querySelectorAll('a')];
  const phases = links.map((a) => document.querySelector(a.hash));

  const spy = () => {
    const line = innerHeight * 0.3;
    let cur = 0;
    phases.forEach((ph, i) => { if (ph.getBoundingClientRect().top <= line) cur = i; });
    links.forEach((a, i) => {
      if (i === cur) {
        if (!a.hasAttribute('aria-current')) {
          a.setAttribute('aria-current', 'true');
          // phones: keep the active chip visible in the sideways row
          if (toc.scrollWidth > toc.clientWidth) toc.scrollTo({ left: a.offsetLeft - 18, behavior: 'smooth' });
        }
      } else a.removeAttribute('aria-current');
    });
  };
  addEventListener('scroll', spy, { passive: true });
  spy();
})();
