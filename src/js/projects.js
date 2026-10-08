// Personal projects list: kind filter + newest / oldest order.
(() => {
  const list = document.querySelector('[data-list]');
  const filter = document.querySelector('[data-filter]');
  const sort = document.querySelector('[data-sort]');
  if (!list) return;

  const press = (group, b) => group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));

  filter.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    press(filter, b);
    list.querySelectorAll('.it').forEach((it) => { it.hidden = b.dataset.kind !== '전체' && it.dataset.kind !== b.dataset.kind; });
  });

  sort.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    press(sort, b);
    const dir = b.dataset.order === 'new' ? -1 : 1;
    [...list.children]
      .sort((x, y) => dir * x.dataset.date.localeCompare(y.dataset.date))
      .forEach((it) => list.appendChild(it));
  });
})();
