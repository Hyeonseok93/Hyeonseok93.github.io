/** HTML for the home page, the four series list pages, the post page and 404. */
const { esc, fmtDate, shortDate, pad2, topic } = require('./util');

/** <img> for a post thumbnail: "card" (640px) or "cover" (full size). */
function thumbImg(media, p, variant = 'card', eager = false) {
  const m = media[p.slug] || {};
  const s = variant === 'card' ? m.card : m[p.thumb];
  if (!s) return '';
  return `<img src="/posts/${p.slug}/${s.src}" width="${s.width}" height="${s.height}" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}
const thumb = (media, p, variant, eager) => `<div class="thumb">${thumbImg(media, p, variant, eager)}</div>`;
const tagList = (tags) => (tags.length ? `<div class="tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : '');
const qmr = (s) => `<dl class="qmr"><dt>문제</dt><dd>${esc(s.problem)}</dd><dt>방법</dt><dd>${esc(s.method)}</dd><dt>결과</dt><dd>${esc(s.result)}</dd></dl>`;
const stat = (items) => `<div class="stat">${items.map(([label, n]) => `<div><b>${esc(n)}</b><span>${esc(label)}</span></div>`).join('')}</div>`;
const dayNo = (d) => `Day ${pad2(d)}`;
/** 전체 / 웹 앱 / … filter buttons with counts; the first one starts pressed. */
const kindChips = (kinds, posts) =>
  `<div class="chips" data-filter>${['전체', ...kinds]
    .map((k, i) => `<button type="button" data-kind="${esc(k)}" aria-pressed="${i === 0}">${esc(k)} <span>${k === '전체' ? posts.length : posts.filter((p) => p.kind === k).length}</span></button>`)
    .join('')}</div>`;
const range = (posts) => `${fmtDate(posts[0].date)} – ${fmtDate(posts.at(-1).date)}`;

/** Shared header of the two 루키즈 5기 pages: group title + 일지 / 프로젝트 tabs. */
function rookiesHead(site, c, current) {
  const tabs = [
    ['log', site.rookies.log.label, '/rookies/log/', c.days.length],
    ['projects', site.rookies.projects.label, '/rookies/projects/', c.track.length],
  ];
  return `<section class="rhead"><span class="k">${esc(site.rookies.org)}</span><h1>${esc(site.rookies.label)}</h1></section>
  <nav class="subtabs" aria-label="루키즈 5기">${tabs.map(([k, label, href, n]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${label} <span>${n}</span></a>`).join('')}</nav>`;
}

/* ================= home ================= */

function homePage(site, c, media) {
  const card = (p, label, title) =>
    `<a class="bk" href="${p.url}"${p.kind ? ` data-kind="${esc(p.kind)}"` : ''}>${thumb(media, p)}<div class="tx"><small>${esc(label)}</small><h3>${esc(title)}</h3><time datetime="${p.date}">${fmtDate(p.date)}</time></div></a>`;
  const shelf = (title, extra, href, cards, cls = '', tag = 'h2') =>
    `<section class="shelf ${cls}"><div class="hd"><${tag}>${title}</${tag}>${extra}<a href="${href}">전체 보기 →</a></div><div class="row">${cards}</div></section>`;

  const papers = [...c.papers].reverse();
  const { kinds } = site.projects;
  const projects = c.projects; // grouped by kind, newest first within a kind
  const last = c.phases.length - 1;
  const phaseTabs = c.phases
    .map((ph, i) => `<button type="button" role="tab" id="pt${i}" aria-controls="pe${i}" aria-selected="${i === last}"><i>Day ${ph.from}–${ph.to}</i><b>${esc(ph.name)}</b><small>${shortDate(ph.days[0].date)} – ${shortDate(ph.days.at(-1).date)}</small></button>`)
    .join('');
  const phaseLists = c.phases
    .map((ph, i) => `<div class="entries" role="tabpanel" id="pe${i}" aria-labelledby="pt${i}"${i === last ? '' : ' hidden'}>${ph.days.map((d) => `<a href="${d.url}"><em>${dayNo(d.day)}</em><b>${esc(d.title)}</b><time datetime="${d.date}">${shortDate(d.date)}</time></a>`).join('')}</div>`)
    .join('');
  const [l1, l2, l3] = site.home.headline;
  const seriesCount = [c.papers, c.projects, c.days, c.track].filter((s) => s.length).length;

  return `<div class="w">
  <section class="hello">
    <div class="intro"><p class="welcome">${esc(site.home.welcome)} <span aria-hidden="true">🐶</span></p>
      <h1>${esc(l1)}<br><em>${esc(l2)}</em> ${esc(l3)}</h1><p class="sub">${esc(site.home.sub)}</p>
      ${stat([['글', c.visible.length], ['시리즈', seriesCount], ['일지', c.days.length]])}</div>
    <picture class="mascot">
      <source srcset="/assets/img/greeting-still.webp" media="(prefers-reduced-motion: reduce)">
      <img src="/assets/img/greeting.webp" width="400" height="225" alt="노트북 앞에서 손을 흔드는 불도그 마스코트">
    </picture>
  </section>
  ${shelf(esc(site.papers.label), `<span>${esc(site.papers.field)} 연구 ${c.papers.length}편</span>`, '/papers/', papers.map((p) => card(p, '논문', p.title)).join(''))}
  ${shelf(esc(site.projects.label), kindChips(kinds, projects), '/projects/', projects.map((p) => card(p, p.kind, p.title)).join(''), 'personal')}
  <section class="group"><div class="ghd"><h2>${esc(site.rookies.label)}</h2><span>${esc(site.rookies.org)} · ${esc(site.rookies.log.label)} ${c.days.length} · ${esc(site.rookies.projects.label)} ${c.track.length}</span></div>
    <section class="shelf sub"><div class="hd"><h3>${esc(site.rookies.log.label)}</h3><span>${c.days.length}일의 오프라인 세션 기록</span><a href="/rookies/log/">전체 보기 →</a></div>
      <div class="log" data-phases><div class="phases" role="tablist">${phaseTabs}</div>${phaseLists}</div></section>
    ${shelf(esc(site.rookies.projects.label), `<span>미니 ${c.track.filter((p) => !p.role).length} · 최종 ${c.track.filter((p) => p.role).length}</span>`, '/rookies/projects/', [...c.track].reverse().map((p) => card(p, p.role ? `최종 · ${p.role}` : p.stage, p.name)).join(''), 'sub', 'h3')}
  </section>
</div>`;
}

/* ================= lists ================= */

function papersPage(site, c, media) {
  const cards = c.papers
    .map((p, i) => `<a class="pp" href="${p.url}"><div>${thumb(media, p)}${tagList(p.tags)}</div>
    <div class="tx"><div class="m"><b>${pad2(i + 1)}</b><time datetime="${p.date}">${fmtDate(p.date)}</time></div><h2>${esc(p.title)}</h2>${p.summary ? qmr(p.summary) : ''}</div></a>`)
    .join('');
  return `<div class="w">
  <section class="phead"><div><span class="k">시리즈</span><h1>${esc(site.papers.label)}</h1><p>${esc(site.papers.description)}</p></div>
    ${stat([['글', c.papers.length], ['분야', site.papers.field]])}</section>
  <div class="papers">${cards}</div>
  <p class="link">↔ <span><b>두 글은 이어집니다.</b> ${esc(site.papers.link)}</span></p>
</div>`;
}

function projectsPage(site, c, media) {
  const { kinds } = site.projects;
  const all = c.projectsByDate;
  const items = all
    .map((p) => `<a class="it" href="${p.url}" data-kind="${esc(p.kind)}" data-date="${p.date}">${thumb(media, p)}
    <div class="tx"><div class="m"><b>${esc(p.kind)}</b><time datetime="${p.date}">${fmtDate(p.date)}</time></div><h2>${esc(p.name)}${p.subtitle ? `<span>${esc(p.subtitle)}</span>` : ''}</h2><p>${esc(p.excerpt)}</p>
    ${tagList(p.tags)}</div></a>`)
    .join('');
  return `<div class="w">
  <section class="phead"><div><span class="k">시리즈</span><h1>${esc(site.projects.label)}</h1><p>${esc(site.projects.description)}</p></div>
    ${stat(kinds.map((k) => [k, all.filter((p) => p.kind === k).length]))}</section>
  <div class="bar">${kindChips(kinds, all)}
    <div class="sort" data-sort><button type="button" data-order="new" aria-pressed="true">최신순</button><button type="button" data-order="old" aria-pressed="false">오래된순</button></div></div>
  <div class="list" data-list>${items}</div>
</div>`;
}

function rookiesLogPage(site, c, media) {
  const toc = c.phases.map((ph, i) => `<a href="#p${i + 1}"${i === 0 ? ' aria-current="true"' : ''}><i>Day ${ph.from}–${ph.to}</i><b>${esc(ph.name)}</b></a>`).join('');
  const phases = c.phases
    .map((ph, i) => `<section class="phase" id="p${i + 1}"><div class="ph"><i>단계 ${i + 1} · Day ${ph.from}–${ph.to}</i><h2>${esc(ph.name)}</h2><p>${esc(ph.description)}</p>
      <time>${range(ph.days)} · 일지 ${ph.days.length}개</time></div>
      ${ph.days.map((d) => `<div class="day"><div class="d">${shortDate(d.date)}</div><div class="ln"></div>
        <a class="c" href="${d.url}"><div><em>${dayNo(d.day)}</em><h3>${esc(d.title)}</h3><p>${esc(d.excerpt)}</p></div>${thumb(media, d)}</a></div>`).join('')}</section>`)
    .join('');
  return `<div class="w">
  ${rookiesHead(site, c, 'log')}
  <section class="phead"><div><p>${esc(site.rookies.log.description)}</p></div>
    ${stat([['일지', c.days.length], ['단계', c.phases.length], ['기간', `${shortDate(c.days[0].date)} – ${shortDate(c.days.at(-1).date)}`]])}</section>
  <div class="wrap"><nav class="ltoc" data-ltoc aria-label="단계"><small>단계</small>${toc}</nav><div>${phases}</div></div>
</div>`;
}

function rookiesProjectsPage(site, c, media) {
  const info = site.rookies.projects;
  const card = (p, top) => `<a class="card" href="${p.url}">${thumb(media, p)}<div class="tx">
    <div class="m">${top}<time datetime="${p.date}">${fmtDate(p.date)}</time></div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>${tagList(p.stack)}</div></a>`;
  const finals = c.track.filter((p) => p.role);
  const minis = c.track.filter((p) => !p.role);
  return `<div class="w">
  ${rookiesHead(site, c, 'projects')}
  <section class="phead"><div><p>${esc(info.description)}</p></div>${stat([['미니', minis.length], ['최종', finals.length]])}</section>
  <section class="sec"><div class="hd"><h2>최종 프로젝트</h2><span>${esc(info.finalTopic)}</span></div>
    <p class="ds">${esc(info.finalNote)} 만드는 과정은 <a href="/rookies/log/">일지 ${c.days.length}편</a>에 남겼습니다.</p>
    <div class="pair">${card(finals[0], `<span class="role">${esc(finals[0].role)}</span>`)}<div class="ar" aria-hidden="true"><i>→</i>진단</div>${card(finals[1], `<span class="role">${esc(finals[1].role)}</span>`)}</div></section>
  <section class="sec"><div class="hd"><h2>미니 프로젝트</h2><span>교육 단계마다 1개씩</span></div>
    <div class="minis">${minis.map((p, i) => `<div><div class="st"><b>${i + 1}</b>${esc(p.after)}</div>${card(p, `<b>${esc(p.stage)}</b>`)}</div>`).join('')}</div></section>
</div>`;
}

/* ================= post ================= */

function postHead(site, c, p, art) {
  let ser = '';
  let title = esc(p.title);
  let info = '';
  if (p.series === 'rookies-log') {
    ser = `<a href="/rookies/log/">${esc(site.rookies.label)} · ${esc(site.rookies.log.label)}</a><span>›</span><span>${esc(p.phase.name)}</span><i>Day ${p.day} / ${c.days.length}</i>`;
  } else if (p.series === 'papers') {
    ser = `<a href="/papers/">${esc(site.papers.label)}</a><span>›</span><span>${esc(site.papers.field)}</span><i>${pad2(p.index + 1)} / ${pad2(c.papers.length)}</i>`;
  } else if (p.series === 'projects') {
    const same = c.projects.filter((x) => x.kind === p.kind);
    ser = `<a href="/projects/">${esc(site.projects.label)}</a><span>›</span><span>${esc(p.kind)}</span>${same.length > 1 ? `<i>${same.indexOf(p) + 1} / ${same.length}</i>` : ''}`;
    title = `${esc(p.name)}${p.subtitle ? `<span class="st">${esc(p.subtitle)}</span>` : ''}`;
    info = infoCard([['종류', `<b>${esc(p.kind)}</b>`]], p.tags, art);
  } else if (p.series === 'rookies-projects') {
    ser = `<a href="/rookies/projects/">${esc(site.rookies.label)} · ${esc(site.rookies.projects.label)}</a><span>›</span><span>${esc(p.stage)}</span>${p.role ? `<i>${esc(p.role)}</i>` : ''}<i>${p.index + 1} / ${c.track.length}</i>`;
    title = `${esc(p.name)}<span class="st">${esc(p.stageTitle)}</span>`;
    info = infoCard(p.after ? [['진행 시점', `<b>${esc(p.after)}</b>`]] : [], p.stack, art);
  }
  const tags = p.series === 'papers' || p.series === 'rookies-log' ? p.tags : [];
  return `${ser ? `<div class="ser">${ser}</div>` : ''}
      <h1 class="t">${title}</h1>
      <div class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time><span>·</span><span>읽는 시간 약 ${art.readMinutes}분</span>${tags.length ? `<div class="tags">${tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}</div>
      ${info}`;
}

function infoCard(cells, stack, art) {
  const repo = art.repo
    ? `<a class="gh" href="${esc(art.repo.href)}" target="_blank" rel="noopener"><small>GitHub</small><b>${esc(art.repo.name)} ↗</b>${art.deploy?.domain ? `<span class="dn">${esc(art.deploy.domain)}${art.deploy.down ? ' · 운영 종료' : ''}</span>` : ''}</a>`
    : '';
  return `<div class="info">${cells.map(([k, v]) => `<div><small>${k}</small>${v}</div>`).join('')}<div class="stack"><small>스택</small>${tagList(stack)}</div>${repo}</div>`;
}

function postBottom(site, c, p, media) {
  if (p.series === 'rookies-log') {
    const ph = p.phase;
    const prev = c.days.find((d) => d.day === p.day - 1);
    const next = c.days.find((d) => d.day === p.day + 1);
    return `<section class="series"><div class="sh"><b>${esc(ph.name)}</b><span>단계 ${ph.index + 1} · Day ${ph.from}–${ph.to} · ${ph.days.indexOf(p) + 1} / ${ph.days.length}</span><a href="/rookies/log/">일지 전체 →</a></div>
      <div class="prog"><i style="width:${((p.day / c.days.length) * 100).toFixed(1)}%"></i></div>
      <ol class="days">${ph.days.map((d) => `<li><a href="${d.url}"${d === p ? ' aria-current="page"' : ''}><em>${dayNo(d.day)}</em><b>${esc(d.title)}</b></a></li>`).join('')}</ol></section>
    ${prevNext(prev && [prev.url, `← 이전 글 · Day ${prev.day}`, prev.title], next && [next.url, `다음 글 · Day ${next.day} →`, next.title])}`;
  }
  if (p.series === 'papers') {
    const o = c.papers.find((x) => x !== p);
    if (!o) return '';
    return `<section class="series"><div class="sh"><b>함께 읽을 논문</b><span>${esc(site.papers.label)} · ${pad2(o.index + 1)} / ${pad2(c.papers.length)}</span><a href="/papers/">논문 전체 →</a></div>
      <p class="rel">↔ ${esc(site.papers.link)}</p>
      <a class="pc" href="${o.url}">${thumb(media, o)}<div><time datetime="${o.date}">${fmtDate(o.date)}</time><h3>${esc(o.title)}</h3>${o.summary ? qmr(o.summary) : ''}</div></a></section>`;
  }
  if (p.series === 'projects') {
    const same = c.projects.filter((x) => x.kind === p.kind);
    const item = (x) => `<li><a href="${x.url}"${x === p ? ' aria-current="page"' : ''}>${thumb(media, x)}<span class="tx"><b>${esc(x.name)}</b><small>${esc(x.subtitle || x.kind)}</small></span><time datetime="${x.date}">${shortDate(x.date)}</time></a></li>`;
    const box = same.length > 1
      ? `<div class="sh"><b>${esc(p.kind)}</b><span>${esc(site.projects.label)} · ${same.length}개 중 ${same.indexOf(p) + 1}번째</span><a href="/projects/">프로젝트 전체 →</a></div><ol class="same">${same.map(item).join('')}</ol>`
      : `<div class="sh"><b>다른 프로젝트</b><span>${esc(p.kind)}${topic(p.kind)} 이 글 하나입니다</span><a href="/projects/">프로젝트 전체 →</a></div><ol class="same">${c.projectsByDate.filter((x) => x !== p).slice(0, 3).map(item).join('')}</ol>`;
    const i = c.projectsByDate.indexOf(p);
    const older = c.projectsByDate[i + 1];
    const newer = c.projectsByDate[i - 1];
    return `<section class="series">${box}</section>
    ${prevNext(older && [older.url, `← 이전 프로젝트 · ${older.kind}`, older.name], newer && [newer.url, `다음 프로젝트 · ${newer.kind} →`, newer.name])}`;
  }
  if (p.series === 'rookies-projects') {
    const step = (x) => `<a href="${x.url}"${x === p ? ' aria-current="page"' : ''}>${thumb(media, x)}<small>${esc(x.role ? `최종 · ${x.role}` : x.stage)}</small><b>${esc(x.name)}</b></a>`;
    const minis = c.track.filter((x) => !x.role);
    const finals = c.track.filter((x) => x.role);
    let extra = '';
    if (p.role) {
      const other = finals.find((x) => x !== p);
      extra = `<div class="extra"><a href="${other.url}">${esc(p.partnerLabel)} <b>${esc(other.name)} →</b></a><a href="/rookies/log/">만드는 과정은 <b>일지 ${c.days.length}편 →</b></a></div>`;
    }
    const prev = c.track[p.index - 1];
    const next = c.track[p.index + 1];
    return `<section class="series"><div class="sh"><b>${esc(site.rookies.label)} 프로젝트</b><span>${c.track.length}개 중 ${p.index + 1}번째</span><a href="/rookies/projects/">프로젝트 전체 →</a></div>
      <div class="steps" data-steps>${minis.map(step).join('<i class="ar" aria-hidden="true">→</i>')}<i class="ar" aria-hidden="true">→</i><div class="fin">${finals.map(step).join('')}</div></div>${extra}</section>
    ${prevNext(prev && [prev.url, `← 이전 · ${prev.stage}`, prev.name], next && [next.url, `다음 · ${next.stage} →`, next.name])}`;
  }
  return '';
}

function prevNext(prev, next) {
  if (!prev && !next) return '';
  const a = (x, cls = '') => `<a${cls} href="${x[0]}"><small>${esc(x[1])}</small><b>${esc(x[2])}</b></a>`;
  return `<nav class="pn" aria-label="이전 글 / 다음 글">${prev ? a(prev) : '<span></span>'}${next ? a(next, ' class="nx"') : ''}</nav>`;
}

function postPage(site, c, p, art, media) {
  const toc = art.toc;
  const tocBox = toc.length
    ? `<aside class="toc" data-toc><div class="box"><div class="toc-h">목차<span data-pct>0%</span></div><div class="pg"><i data-pg></i></div><div class="toc-list">${toc
        .map((s) => `<div class="ts" data-id="${s.id}"><a href="#${s.id}"><em>${s.num}</em><b>${esc(s.label)}</b></a>${s.subs.length ? `<div class="sub"><div>${s.subs.map((x) => `<a href="#${x.id}">${esc(x.label)}</a>`).join('')}</div></div>` : ''}</div>`)
        .join('')}</div><a class="top" href="#">↑ 맨 위로</a></div></aside>`
    : '';
  const mtoc = toc.length
    ? `<details class="mtoc" data-mtoc><summary>목차 <span>${toc.length}개 단원</span></summary><ol>${toc.map((s) => `<li><a href="#${s.id}"><em>${s.num}</em>${esc(s.label)}</a></li>`).join('')}</ol></details>`
    : '';
  const cover = p.thumb ? `<div class="cover">${thumbImg(media, p, 'cover', true)}</div>` : '';
  return `<div class="progress" data-progress></div>
<div class="w"><div class="post">
    <article>
      ${postHead(site, c, p, art)}
      ${mtoc}
      ${cover}
      <div class="prose" data-prose>${art.html}</div>
      ${postBottom(site, c, p, media)}
    </article>
    ${tocBox}
</div></div>`;
}

const ZOOM = '<div class="zoom" data-zoom><img alt=""></div>';

function notFoundPage() {
  return `<div class="w nf"><b>404</b><p>찾는 페이지가 없습니다. 주소가 바뀌었거나 삭제된 글일 수 있습니다.</p><a href="/">홈으로</a></div>`;
}

module.exports = { homePage, papersPage, projectsPage, rookiesLogPage, rookiesProjectsPage, postPage, notFoundPage, ZOOM };
