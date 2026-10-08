// Every page: header search (fetches /search.json on first open) and old home-hash redirects.
(() => {
  // the old single-page home used /#category-<id> and /#tag-<name>
  const OLD = {
    'category-papers': '/papers/',
    'category-personal-web': '/projects/',
    'category-personal-toy': '/projects/',
    'category-rookies-offline': '/rookies/log/',
    'category-rookies-showcase': '/rookies/projects/',
  };
  const redirectOldHash = () => {
    if (location.pathname !== '/' || !location.hash) return;
    const key = decodeURIComponent(location.hash.slice(1));
    if (OLD[key]) location.replace(OLD[key]);
    else if (key.startsWith('tag-')) location.replace(`/?q=${encodeURIComponent(key.slice(4))}`);
  };
  redirectOldHash();
  addEventListener('hashchange', redirectOldHash);

  const panel = document.querySelector('[data-search]');
  if (!panel) return;
  const input = panel.querySelector('input');
  const list = panel.querySelector('[data-search-results]');
  let index = null;
  let active = -1;

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ');
  const mark = (text, terms) => {
    let out = esc(text);
    for (const t of terms) {
      const re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, (m) => `<mark>${m}</mark>`);
    }
    return out;
  };

  async function load() {
    if (!index) {
      const res = await fetch('/search.json');
      index = (await res.json()).map((p) => ({ ...p, hay: norm(`${p.t} ${p.g.join(' ')} ${p.s} ${p.e}`), title: norm(p.t) }));
    }
    return index;
  }

  function render() {
    const terms = norm(input.value).trim().split(' ').filter(Boolean);
    active = -1;
    if (!terms.length) {
      list.innerHTML = '<li class="empty">제목, 태그, 내용으로 글을 찾습니다</li>';
      return;
    }
    const hits = index
      .filter((p) => terms.every((t) => p.hay.includes(t)))
      .map((p) => ({ p, score: terms.filter((t) => p.title.includes(t)).length }))
      .sort((a, b) => b.score - a.score || b.p.d.localeCompare(a.p.d))
      .slice(0, 30);
    list.innerHTML = hits.length
      ? hits.map(({ p }) => `<li><a href="${p.u}"><small>${esc(p.s)}</small><b>${mark(p.t, terms)}</b><span>${esc(p.e)}</span></a></li>`).join('')
      : '<li class="empty">결과가 없습니다</li>';
  }

  function move(step) {
    const links = [...list.querySelectorAll('a')];
    if (!links.length) return;
    active = (active + step + links.length) % links.length;
    links.forEach((a, i) => a.setAttribute('aria-selected', String(i === active)));
    links[active].scrollIntoView({ block: 'nearest' });
  }

  async function open(q = '') {
    panel.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    input.value = q;
    input.focus();
    await load();
    render();
  }
  function close() {
    panel.classList.remove('on');
    document.documentElement.style.overflow = '';
  }

  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', () => open()));
  panel.querySelector('[data-search-close]').addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  input.addEventListener('input', () => index && render());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      const links = list.querySelectorAll('a');
      const target = links[Math.max(active, 0)];
      if (target) location.href = target.href;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('on')) close();
    else if (e.key === '/' && !panel.classList.contains('on') && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      open();
    }
  });

  // /?q=... (old tag links) opens search with the term filled in
  const q = new URLSearchParams(location.search).get('q');
  if (q) open(q);
})();
