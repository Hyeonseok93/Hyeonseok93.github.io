// Home: kind filter on the personal-project shelf, phase tabs on the Rookies log.
(() => {
  const filter = document.querySelector('.personal [data-filter]');
  if (filter) {
    const row = filter.closest('.shelf').querySelector('.row');
    filter.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      filter.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      row.querySelectorAll('.bk').forEach((card) => { card.hidden = b.dataset.kind !== '전체' && card.dataset.kind !== b.dataset.kind; });
      row.scrollLeft = 0;
    });
  }

  const log = document.querySelector('[data-phases]');
  if (log) {
    const tabs = [...log.querySelectorAll('[role=tab]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
    // phone: the phase row scrolls, so bring the selected tab into view
    const on = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (on) on.parentElement.scrollLeft = on.offsetLeft;
  }
})();
