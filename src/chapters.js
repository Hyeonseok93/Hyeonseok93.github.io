import { CHAPTER_VIEWBOX, CHAPTER_FLOOR_Y, CHAPTERS } from './data/chapters.js';

const CHAPTER_TAB_CLASS =
  'chapter-tab flex items-center justify-between py-2.5 px-4 rounded-xl border border-white/5 text-[0.85rem] font-bold tracking-wide transition-all bg-white/[0.02] text-left text-gray-400 hover:text-white hover:bg-white/10 active:scale-[0.98] duration-200 select-none';

let cumulativeRatios = [];

function getChapterPoints() {
  return CHAPTERS.map((chapter) => chapter.point);
}

function pointsToPolyline(points) {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function pointsToAreaPolygon(points, floorY = CHAPTER_FLOOR_Y) {
  const first = points[0];
  const last = points[points.length - 1];
  return `${first.x},${floorY} ${pointsToPolyline(points)} ${last.x},${floorY}`;
}

function computeCumulativeRatios(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  const total = lengths[lengths.length - 1];
  return lengths.map((length) => length / total);
}

function pointToPercent(point) {
  return {
    left: `${(point.x / CHAPTER_VIEWBOX.width) * 100}%`,
    top: `${(point.y / CHAPTER_VIEWBOX.height) * 100}%`,
  };
}

function renderChapterTabs() {
  const list = document.getElementById('chapter-tabs-list');
  if (!list) return;

  list.innerHTML = CHAPTERS.map((chapter) => {
    const tagClass = chapter.tabTagAccent
      ? 'text-[0.62rem] font-bold text-accentAmber'
      : 'text-[0.62rem] font-normal opacity-50';
    return `
      <button type="button" data-chapter="${chapter.id}" class="${CHAPTER_TAB_CLASS}">
        <span>${chapter.tabLabel}</span><span class="${tagClass}">${chapter.tabTag}</span>
      </button>`;
  }).join('');
}

function renderChapterGraph() {
  const points = getChapterPoints();
  const polyline = pointsToPolyline(points);

  const areaFill = document.getElementById('chapter-area-fill');
  const basePath = document.getElementById('chapter-base-path');
  const activePath = document.getElementById('active-path');

  if (areaFill) areaFill.setAttribute('points', pointsToAreaPolygon(points));
  if (basePath) basePath.setAttribute('points', polyline);
  if (activePath) activePath.setAttribute('points', polyline);

  cumulativeRatios = computeCumulativeRatios(points);
}

function renderChapterDots() {
  const layer = document.getElementById('chapter-dots-layer');
  if (!layer) return;

  layer.innerHTML = CHAPTERS.map((chapter) => {
    const { left, top } = pointToPercent(chapter.point);
    return `
      <button
        type="button"
        data-chapter="${chapter.id}"
        class="chapter-dot absolute group transition-all duration-300 -translate-x-1/2 -translate-y-1/2"
        style="left: ${left}; top: ${top};"
      >
        <span class="absolute inset-0 rounded-full bg-[#d97706]/40 animate-ping opacity-0 group-[.active]:opacity-100 duration-1000"></span>
        <span class="relative block w-3.5 h-3.5 rounded-full bg-bgSecondary border-2 border-white/20 group-hover:bg-[#d97706] group-hover:border-[#d97706] group-hover:scale-125 group-[.active]:bg-[#d97706] group-[.active]:border-white group-[.active]:scale-125 transition-all"></span>
      </button>`;
  }).join('');
}

function renderChapterTimeline() {
  renderChapterTabs();
  renderChapterGraph();
  renderChapterDots();
}

function getChapterById(id) {
  return CHAPTERS.find((chapter) => chapter.id === id);
}

function setActiveChapter(idx) {
  const chapter = getChapterById(idx);
  if (!chapter) return;

  document.querySelectorAll('.chapter-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx - 1);
  });

  document.querySelectorAll('.chapter-tab').forEach((tab, i) => {
    if (i === idx - 1) {
      tab.classList.remove('bg-white/[0.02]', 'text-gray-400', 'border-white/5');
      tab.classList.add('bg-accentAmber/10', 'text-accentAmber', 'border-accentAmber/30');
    } else {
      tab.classList.remove('bg-accentAmber/10', 'text-accentAmber', 'border-accentAmber/30');
      tab.classList.add('bg-white/[0.02]', 'text-gray-400', 'border-white/5');
    }
  });

  const path = document.getElementById('active-path');
  if (path && cumulativeRatios.length) {
    const totalLength = path.getTotalLength();
    path.style.strokeDasharray = String(totalLength);
    const activeLength = cumulativeRatios[idx - 1] * totalLength;
    path.style.strokeDashoffset = String(totalLength - activeLength);
  }

  const details = document.getElementById('chapter-details');
  const iconBox = document.getElementById('chapter-icon-box');
  const titleBox = document.getElementById('chapter-title-box');
  const descBox = document.getElementById('chapter-desc-box');
  if (!details || !iconBox || !titleBox || !descBox) return;

  details.style.opacity = '0';
  setTimeout(() => {
    iconBox.textContent = chapter.icon;
    titleBox.textContent = chapter.sub;
    descBox.innerHTML = chapter.desc;
    details.style.opacity = '1';
  }, 150);
}

function initChapters() {
  if (!document.getElementById('chapter-timeline')) return;

  renderChapterTimeline();

  document.querySelectorAll('[data-chapter]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveChapter(Number(btn.dataset.chapter)));
  });

  requestAnimationFrame(() => setActiveChapter(9));
}

document.addEventListener('DOMContentLoaded', initChapters);
